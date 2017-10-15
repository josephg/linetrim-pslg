//Load the module
var linetrim = require('../linetrim')

//Red PSLG - Define a triangle
var linePoints = [
  [0.5, 0.25],
  [0.25, 0.5],
  [0.75, 0.75]
]
var lineEdges = [ [0,1], [1,2], [2,0] ]

//Blue PSLG - Define a square
var polyPoints = [
  [0.25, 0.25],
  [0.25,  0.6],
  [0.6, 0.6],
  [0.6, 0.25]
]
var polyEdges = [ [0,1], [1,2], [2,3], [3,0] ]

//Construct intersection
console.log(linetrim(linePoints, lineEdges, polyPoints, polyEdges, false))
