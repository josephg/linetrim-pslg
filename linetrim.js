'use strict'

// This code is a modified version of this:
// https://github.com/mikolalysenko/overlay-pslg

var snapRound = require('clean-pslg')
var cdt2d = require('cdt2d')
var bsearch = require('binary-search-bounds')

module.exports = lineTrimPSLG

var RED  = 0
var BLUE = 1


function getTable(op) {
  if(typeof op !== 'string') {
    return OPERATORS.xor
  }
  var x = OPERATORS[op.toLowerCase()]
  if(x) {
    return x
  }
  return OPERATORS.xor
}


function compareEdge(a, b) {
  return Math.min(a[0], a[1]) - Math.min(b[0], b[1]) ||
         Math.max(a[0], a[1]) - Math.max(b[0], b[1])
}

function edgeCellIndex(edge, cell) {
  var a = edge[0]
  var b = edge[1]
  for(var i=0; i<3; ++i) {
    if(cell[i] !== a && cell[i] !== b) {
      return i
    }
  }
  return -1
}

function buildCellIndex(cells) {
  //Initialize cell index
  var cellIndex = new Array(3*cells.length).fill(-1)

  //Sort edges
  var edges = []
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    for(var j=0; j<3; ++j) {
      edges.push([c[j], c[(j+1)%3], i])
    }
  }
  edges.sort(compareEdge)

  //For each pair of edges, link adjacent cells
  for(var i=1; i<edges.length; ++i) {
    var e = edges[i]
    var f = edges[i-1]
    if(compareEdge(e, f) !== 0) {
      continue
    }
    var ce = e[2]
    var cf = f[2]
    var ei = edgeCellIndex(e, cells[ce])
    var fi = edgeCellIndex(f, cells[cf])
    cellIndex[3*ce+ei] = cf
    cellIndex[3*cf+fi] = ce
  }

  return cellIndex
}

function compareLex2(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    var a = e[0]
    var b = e[1]
    e[0] = Math.min(a, b)
    e[1] = Math.max(a, b)
  }
  edges.sort(compareLex2)
}


var TMP = [0,0]
function findEdge(edges, a, b) {
  TMP[0] = Math.min(a,b)
  TMP[1] = Math.max(a,b)
  return bsearch.eq(edges, TMP, compareLex2)
}

function isConstraint(edges, a, b) {
  return findEdge(edges, a, b) >= 0
}


//Classify all cells within boundary
function markCells(cells, adj, edges) {

  //Initialize active/next queues and flags
  var flags = new Array(cells.length)
  var constraint = new Array(3*cells.length).fill(false)
  var active = []
  var next   = []
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    flags[i] = 0
    for(var j=0; j<3; ++j) {
      var a = c[(j+1)%3]
      var b = c[(j+2)%3]
      var constr = constraint[3*i+j] = isConstraint(edges, a, b)
      if(adj[3*i+j] >= 0) {
        continue
      }
      if(constr) {
        next.push(i)
      } else {
        flags[i] = 1
        active.push(i)
      }
    }
  }

  //Mark flags
  var side = 1
  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop()
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side
      var c = cells[t]
      for(var j=0; j<3; ++j) {
        var f = adj[3*t+j]
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f)
          } else {
            active.push(f)
            flags[f] = side
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next
    next = active
    active = tmp
    next.length = 0
    side = -side
  }

  return flags
}

function removeUnusedPoints(points, edges) {
  var labels = new Array(points.length).fill(-1)
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    labels[e[0]] = labels[e[1]] = 1
  }

  var ptr = 0
  for(var i=0; i<points.length; ++i) {
    if(labels[i] > 0) {
      labels[i] = ptr
      points[ptr++] = points[i]
    }
  }

  points.length = ptr

  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    e[0] = labels[e[0]]
    e[1] = labels[e[1]]
  }
}

function lineTrimPSLG(linePoints, lineEdges, polyPoints, polyEdges, modeIntersect) {
  //1.  concatenate points
  var numLinePoints = linePoints.length
  var points = linePoints.concat(polyPoints)

  //2.  concatenate edges
  var numRedEdges  = lineEdges.length
  var numBlueEdges = polyEdges.length
  var edges        = new Array(numRedEdges + numBlueEdges)
  var colors       = new Array(numRedEdges + numBlueEdges)
  for(var i=0; i<lineEdges.length; ++i) {
    var e      = lineEdges[i]
    colors[i]  = RED
    edges[i]   = [ e[0], e[1] ]
  }
  for(var i=0; i<polyEdges.length; ++i) {
    var e      = polyEdges[i]
    colors[i+numRedEdges]  = BLUE
    edges[i+numRedEdges]   = [ e[0]+numLinePoints, e[1]+numLinePoints ]
  }

  //3.  run snap rounding with edge colors
  snapRound(points, edges, colors)

  //4. Sort edges
  canonicalizeEdges(edges)

  //5.  extract red and blue edges
  var redE = [], blueE = []
  for(var i=0; i<edges.length; ++i) {
    if (edges[i][0] === edges[i][1]) continue
    if(colors[i] === RED) {
      redE.push(edges[i])
    } else {
      blueE.push(edges[i])
    }
  }

  //6.  triangulate. TODO: We should only need the poly edges for this.
  var cells = cdt2d(points, edges, { delaunay: false })

  //7. build adjacency data structure
  var adj = buildCellIndex(cells)

  //8. classify triangles
  var polyFlags = markCells(cells, adj, blueE)

  //9. classify which line segments are inside and outside of the polygon
  var flags = new Array(redE.length).fill(1)
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    var polarity = polyFlags[i]
    //flags[i] = 0
    for(var j=0; j<3; ++j) {
      var a = c[(j+1)%3]
      var b = c[(j+2)%3]
      var e = findEdge(redE, a, b)
      if (e >= 0) {
        flags[e] = polarity
      }
    }
  }

  //10. filter out line segments
  const keepIn = modeIntersect
  const keepOut = !modeIntersect

  const keptEdges = []
  for(var i=0; i<redE.length; ++i) {
    const polarity = flags[i]
    if (polarity < 0 ? keepIn : keepOut) keptEdges.push(redE[i])
  }
  
  //11. filter old points
  removeUnusedPoints(points, keptEdges)

  return {
    points: points,
    edges: keptEdges,
  }
}

