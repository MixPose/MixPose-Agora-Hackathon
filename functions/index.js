const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


const RtcTokenBuilder = require('./src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./src/RtcTokenBuilder').Role;
const RtmTokenBuilder = require('./src/RtmTokenBuilder').RtmTokenBuilder;
const RtmRole = require('./src/RtmTokenBuilder').Role

const generateRtcToken = (className, accountName, roleValue) => {
  // Rtc Examples
  const appID = 'id';
  const appCertificate = 'cert';
  const channelName = className;
  //const uid = 100;
  const account = accountName;
  const role = roleValue;

  const expirationTimeInSeconds = 7200;

  const currentTimestamp = Math.floor(Date.now() / 1000);

  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.

  // Build token with uid
  //const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
  //console.log("Token With Integer Number Uid: " + tokenA);

  // Build token with user account
    const token = RtcTokenBuilder.buildTokenWithAccount(appID, appCertificate, channelName, account, role, privilegeExpiredTs);
    return token
}

exports.generateRtcToken = functions.https.onCall((data, context) => {
  var token =  generateRtcToken(data.className, data.userName, RtcRole.PUBLISHER);
  return token;
});
