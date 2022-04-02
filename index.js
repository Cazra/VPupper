'use strict';

const _ = require('underscore');
const express = require('express');

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
        "iris": {
          // Rotation of the iris around the negative Y axis of the eye.
          "thetaX": 0,
          // Rotation of the iris around the positive X axis of the eye.
          "thetaY": 0
        }
      },
      "right": {
        "openness": 1.0,
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
    "head": 0,
    "armLeft": 110,
    "elbowLeft": -180,
    "wristLeft": -180,
    "armRight": 70,
    "elbowRight": 0,
    "wristRight": 0
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
  });

  return [
    sumV[0]/lastFrames.length,
    sumV[1]/lastFrames.length,
    sumV[1]/lastFrames.length
  ]
}

/**
 * Using our last captured frames, compute a smoothed frame to reduce jitteryness.
 * @return {PuppetData}
 */
function getSmoothedFrame(newData) {
  return {
    "face": {
      "orientation": {
        "look": getFramesAvgVec3(['face', 'orientation', 'look']),
        "up": getFramesAvgVec3(['face', 'orientation', 'up']),
        "right": getFramesAvgVec3(['face', 'orientation', 'right'])
      },
      "eyes": {
        "left": {
          "openness": getFramesAvg(['face', 'eyes', 'left', 'openness']),
          "iris": {
            "thetaX": getFramesAvg(['face', 'eyes', 'left', 'iris', 'thetaX']),
            "thetaY": getFramesAvg(['face', 'eyes', 'left', 'iris', 'thetaY'])
          }
        },
        "right": {
          "openness": getFramesAvg(['face', 'eyes', 'right', 'openness']),
          "iris": {
            "thetaX": getFramesAvg(['face', 'eyes', 'right', 'iris', 'thetaX']),
            "thetaY": getFramesAvg(['face', 'eyes', 'right', 'iris', 'thetaY'])
          }
        }
      },
      "mouth": {
        "smileness": getFramesAvg(['face', 'mouth', 'smileness']),
        "openness": getFramesAvg(['face', 'mouth', 'openness'])
      }
    },
    "bones": {
      "body": getFramesAvg(['bones', 'body']),
      "head": getFramesAvg(['bones', 'head']),
      "armLeft": getFramesAvg(['bones', 'armLeft']),
      "elbowLeft": getFramesAvg(['bones', 'elbowLeft']),
      "wristLeft": getFramesAvg(['bones', 'wristLeft']),
      "armRight": getFramesAvg(['bones', 'armRight']),
      "elbowRight": getFramesAvg(['bones', 'elbowRight']),
      "wristRight": getFramesAvg(['bones', 'wristRight'])
    },
    "handLeft": {
      "fingers": newData.handLeft.fingers,
      "roll": getFramesAvg(['handLeft', 'roll'])
    },
    "handRight": {
      "fingers": newData.handRight.fingers,
      "roll": getFramesAvg(['handRight', 'roll'])
    },
  };
}

const MAX_FRAMES = 4;
let lastFrames = [DEFAULT_DATA];
let smoothedResults = DEFAULT_DATA;

// Setup the routes, middleware, etc. for our server.
let app = express();
app.use('/static', express.static('static'));
app.use(express.json());

// Publish new puppetry data to this server.
app.post('/puppet-data', (req, res) => {
  console.log('Updating puppet data.', req.body);
  let newData = req.body;
  let lastData = lastFrames.slice(-1)[0];
  lastFrames.push(newData);
  if (lastFrames.length > MAX_FRAMES)
    lastFrames = lastFrames.slice(1, MAX_FRAMES + 1);

  // Fill in any missing data with whatever we have from our last frame.
  if (!newData.bones)
    newData.bones = lastData.bones;
  if (!newData.face)
    newData.face = lastData.face;
  if (!newData.handLeft)
    newData.handLeft = lastData.handLeft;
  if (!newData.handRight)
    newData.handRight = lastData.handRight;

  // Smooth out the data with the average of our frames.
  smoothedResults = getSmoothedFrame(newData);
  console.log('Smoothed data: ', smoothedResults);

  res.json('ok');
});
app.get('/puppet-data', (req, res) => {
  console.log('Fetching smoothed puppet data.');
  res.json(smoothedResults);
});

// Start the server.
app.listen(port, err => {
  if (err)
    throw err;
  console.log(`VPupper server running on port ${port}.`);
});
