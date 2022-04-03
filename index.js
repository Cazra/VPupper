'use strict';

const _ = require('underscore');
const express = require('express');
const favicon = require('serve-favicon');

let argv = process.argv.slice(1);
if (argv.length < 2)
  throw new Error('Requires port # argument.');
let port = argv[1];

const DEFAULT_DATA = {
  // Face puppetry
  "face": {
    // basis vectors for face.
    "orientation": {
      "look": [0, 0, -1],
      "up": [0, -1, 0],
      "right": [1, 0, 0]
    },
    // Eye puppetry
    "eyes": {
      "left": {
        // How open is the eye? 1.0 = fully open, 0.0 = closed.
        "openness": 1.0,
        "blink": false,
        "iris": {
          // Rotation of the iris around the negative Y axis of the eye.
          "thetaX": 0,
          // Rotation of the iris around the positive X axis of the eye.
          "thetaY": 0
        }
      },
      "right": {
        "openness": 1.0,
        "blink": false,
        "iris": {
          "thetaX": 0,
          "thetaY": 0
        }
      }
    },
    // Mouth puppetry
    "mouth": {
      // A metric of how much the mouth is smiling.
      // 1.0 = fully smiling.
      // 0.0 = neutral.
      // -1.0 = fully frowning.
      "smileness": 0,
      "openness": 0
    }
  },

  // Global angles (in degrees) for the bones around the Z axis.
  // (assumes angle increase clockwise, like if we use atan2 in a sytem where
  // Y+ points downwards)
  "bones": {
    "body": 0,
    "uBody": [1, 0, 0],
    "head": 0,
    "uHead": [1, 0, 0],

    "armLeft": 110,
    "uArmLeft": [-0.2, 1, 0],
    "elbowLeft": -180,
    "uElbowLeft": [-1, 0, 0],
    "wristLeft": -180,
    "uWristLeft": [-1, 0, 0],

    "armRight": 70,
    "uArmRight": [0.2, 1, 0],
    "elbowRight": 0,
    "uElbowRight": [1, 0, 0],
    "wristRight": 0,
    "uWristRight": [1, 0, 0]
  },

  // Hands puppetry
  "handLeft": {
    // Bitmask for which fingers are extended. From left to right, they are
    // pinky, ring, middle, index, thumb
    "fingers": 0b11111,
    // A metric for the rotation of the hand around the axis of the wrist.
    // 1.0 = palm facing forward.
    // -1.0 = palm facing backward.
    "roll": 0
  },
  "handRight": {
    // Bitmask for which fingers are extended. From left to right, they are
    // pinky, ring, middle, index, thumb
    "fingers": 0b11111,
    // A metric for the rotation of the hand around the axis of the wrist.
    // 1.0 = palm facing forward.
    // -1.0 = palm facing backward.
    "roll": 0
  },
};

/**
 * Get the average value of some numerical property for all the frames.
 * @param  {string[]} path
 * @return {number}
 */
function getFramesAvg(path) {
  return _.reduce(lastFrames, (memo, frame) => {
    return memo + _.get(frame, path);
  }, 0) / lastFrames.length;
}

/**
 * Get the average value of some vec3 property for all the frames.
 * @param  {string[]} path
 * @return {vec3}
 */
function getFramesAvgVec3(path) {
  let sumV = _.reduce(lastFrames, (memo, frame) => {
    let v = _.get(frame, path);
    return [
      memo[0] + v[0],
      memo[1] + v[1],
      memo[2] + v[2]
    ]
  }, [0, 0, 0]);

  return [
    sumV[0]/lastFrames.length,
    sumV[1]/lastFrames.length,
    sumV[2]/lastFrames.length
  ]
}

function massageData(newData, lastData) {
  // Fill in any missing data with whatever we have from our last frame.
  if (!newData.bones)
    newData.bones = lastData.bones;
  if (!newData.face)
    newData.face = lastData.face;
  if (!newData.handLeft)
    newData.handLeft = lastData.handLeft;
  if (!newData.handRight)
    newData.handRight = lastData.handRight;

  // Massage the data with some additional properties for our end Client.
  newData.face.eyes.left.blink = (newData.face.eyes.left.openness < 0.4);
  newData.face.eyes.right.blink = (newData.face.eyes.right.openness < 0.4);
}

let newData = DEFAULT_DATA;

// Setup the routes, middleware, etc. for our server.
let app = express();
app.use(favicon('./favicon.ico'));
app.use('/static', express.static('static'));
app.use(express.json());

// Publish new puppetry data to this server.
app.post('/puppet-data', (req, res) => {
  console.log('Updating puppet data.', req.body);

  let lastData = newData;
  newData = req.body;

  massageData(newData, lastData);

  // Smooth out the data with the average of our frames.
  res.json('ok');
});
app.get('/puppet-data', (req, res) => {
  console.log('Fetching latest puppet data.');
  res.json(newData);
});

// Start the server.
app.listen(port, err => {
  if (err)
    throw err;
  console.log(`VPupper server running on port ${port}.`);
});
