var fs = require('fs')
var path = require('path')

module.exports = function (app) {
  var Notification = app.models.notification;
  var Application = app.models.application;
  var PushModel = app.models.push;

  function startPushServer() {
// Add our custom routes
    var badge = 1;
    app.post('/notify/:id', function (req, res, next) {
      var note = new Notification({
        expirationInterval: 3600, // Expires 1 hour from now.
        badge: badge++,
        sound: 'ping.aiff',
        alert: '\uD83D\uDCE7 \u2709 ' + 'Hello',
        messageFrom: 'Ray'
      });

      PushModel.notifyById(req.params.id, note, function (err) {
        if (err) {
          console.error('Cannot notify %j: %s', req.params.id, err.stack);
          next(err);
          return;
        }
        console.log('pushing notification to %j', req.params.id);
        res.send(200, 'OK');
      });
    });

    PushModel.on('error', function (err) {
      console.error('Push Notification error: ', err.stack);
    });

// Pre-register an application that is ready to be used for testing.
// You should tweak config options in ./config.js

    var config = require('../config.js');

    var pushApp = {
      id: config.id,
      userId: 'voncrank',
      name: config.appName,

      description: 'LoopBack Push Notification for mobile Applications',
      pushSettings: {
        apns: {
          certData: config.apnsCertData,
          keyData: config.apnsKeyData,
          pushOptions: {
            
          },
          feedbackOptions: {
            batchFeedback: true,
            interval: 300
          }
        },
        gcm: {
          serverApiKey: config.gcmServerApiKey
        }
      }
    };

    updateOrCreateApp(function (err, appModel) {
      if (err) {
        throw err;
      }
      console.log('Application id: %j', appModel.id);
    });

    function updateOrCreateApp(cb) {
      Application.findOne({
          where: { id: pushApp.id }
        },
        function (err, result) {
          if (err) cb(err);
          if (result) {
            console.log('Updating application: ' + result.id);
            delete pushApp.id;
            result.updateAttributes(pushApp, cb);
          } else {
            return registerApp(cb);
          }
        });
    }

    function registerApp(cb) {
      console.log('Registering a new Application...');
      // Hack to set the app id to a fixed value so that we don't have to change
      // the client settings
      Application.observe('before save',function (ctx,next) {
        
      	console.log(ctx.instance);
        if (ctx.instance.name === pushApp.name) {
          ctx.instance.id = pushApp.id;
        }
        next();
      });
      Application.register(
        pushApp.userId,
        pushApp.name,
        {
          description: pushApp.description,
          pushSettings: pushApp.pushSettings
        },
        function (err, app) {
          if (err) {
            return cb(err);
          }
          return cb(null, app);
        }
      );
    }
  }
  startPushServer();
};