**VPupper** (Short for "VTuber Puppeteer") is a client-server-client application
that can be used to get face tracking, body rigging, and hand gesture metrics
using [MediaPipe](https://google.github.io/mediapipe/) for the purpose of rigging
and animating 2D VTuber avatars implemented in custom 3rd party applications.
For example, I use it to rig and animate the VTuber avatar I use for my [Twitch streaming](https://www.twitch.tv/cazrasl)
which I built as a Clickteam Fusion application).

This application consist of three parts: a MediaPipe client, the VPupper server, and the avatar client.

# MediaPipe Client
The MediaPipe client is a browser-based client served at `localhost:PORT/static/index.html`.
It is responsible for collecting face tracking, posture, and hand tracking data
using MediaPipe's Holistic solution. It massages this data into metrics that
are more useful (and much easier to digest) for puppeteering a 2D VTuber avatar.
Then the massaged puppeteering data is pushed up to the VPupper server.

# VPupper server
The VPupper server hosts the MediaPipe client and it provides services for
collecting, smoothing, and serving puppeteering data. To run the server, use
the command `node index.js {PORT}`. The server will run on localhost on the
specified port.

You can make RESTful requests to this server to get the latest, smoothed
puppeteering data for your 3rd party avatar client. The route for this is
`GET localhost:PORT/puppet-data`.

The puppeteering data looks something like this:
```
{
  // Face puppetry
  "face": {

    // basis vectors for face.
    "orientation": {

      // The direction the face is looking.
      "look": [0, 0, -1],

      // The direction from the bottom to top of the face.
      "up": [0, -1, 0],

      //The direction from the left to right side of the face.
      "right": [1, 0, 0]
    },

    // Eye puppetry
    "eyes": {
      "left": {

        // How open is the eye? 1.0 = fully open, 0.0 = closed.
        "openness": 1.0,

        // Iris orientation data.
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

      // A metric for how open the mouth is.
      // 1.0 = fully open.
      // 0.0 = fully closed.
      "openness": 0
    }
  },

  // Global angles (in degrees) for the bones around the negative Z axis.
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
    // pinky, ring, middle, index, thumb. 1 indicates the finger is extended.
    // For example, the bitmask for a peace/victory sign is 0b00110
    "fingers": 0b11111,

    // A metric for the rotation of the hand around the axis of the wrist.
    // 1.0 = palm facing forward.
    // -1.0 = palm facing backward.
    "roll": 0
  },
  "handRight": {
    "fingers": 0b11111,
    "roll": 0
  },
}
```

# Avatar Client
This is a 3rd party client application (presumably written by you), which
gets the latest smoothed puppeteering data from the VPupper server and uses it 
to rig and animate a 2D VTuber avatar.
