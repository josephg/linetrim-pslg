'use strict'

var tape = require('tape')
var pathtrim = require('../pathtrim')

const linePoints = [[0,0], [100,80]]
const lineEdges = [[0, 1]]

const polyPoints = [[10,10], [20,10], [20, 20], [10, 20]]
const polyEdges = [[0,1],[1,2],[2,3],[3,0]]

tape('simple intersect check', function(t) {
  const {points, edges} = pathtrim(linePoints, lineEdges, polyPoints, polyEdges, true)

  // This is brittle because the order can change. But if it does for this
  // case, I can eyeball it and fix the test.
  t.deepEquals(points, [ [ 12.5, 10 ], [ 20, 16 ] ])
  t.deepEquals(edges, [ [ 0, 1 ] ])
  t.end()
})

tape('simple subtract check', function(t) {
   const {points, edges} = pathtrim(linePoints, lineEdges, polyPoints, polyEdges, false)

  // This is brittle because the order can change. But if it does for this
  // case, I can eyeball it and fix the test.
  t.deepEquals(points, [ [ 0, 0 ], [ 100, 80 ], [ 12.5, 10 ], [ 20, 16 ] ])
  t.deepEquals(edges, [ [ 0, 2 ], [ 1, 3 ] ])
  t.end()
})

