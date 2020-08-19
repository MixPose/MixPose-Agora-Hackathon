// import { ENGINE_METHOD_ALL } from "constants";

var database = firebase.database();
var tmpGroupId = getMeta("friendgroupid");
// TODO: Enable Firebase Performance Monitoring.
var scheduleClassId = getMeta("scheduleclassid");
var instructorId = getMeta("instructorid");
var classtime = getMeta("classtime");
var userid;
var functions = firebase.functions();

let carouselAutoplayIntervalId = null;

const $lessonPage = $('.lesson-page');
const $owlCarouselNew = $lessonPage.find('.owl-carousel-new.owl-theme');
const $owlCarouselButtonContainer = $lessonPage.find('.owl-carousel-button-container');
const $btnAutoPlayCarousel = $lessonPage.find('.autoPlayCarousel');
const $btnStopAutoPlayCarousel = $lessonPage.find('.stopAutoPlayCarousel');

const color = '#00cb39';
const boundingBoxColor = 'red';
const lineWidth = 2;

var rtc = {
  client: null,
  joined: false,
  published: false,
  localStream: null,
  remoteStreams: [],
  params: {}
  };

console.log("agora sdk version: " + AgoraRTC.VERSION + " compatible: " + AgoraRTC.checkSystemRequirements())
var resolutions = [
  {
    name: "default",
    value: "default",
  },
  {
    name: "480p",
    value: "480p",
  },
  {
    name: "720p",
    value: "720p",
  },
  {
    name: "1080p",
    value: "1080p"
  }
];

$(document).ready(function() {
  collapsibleInstructorInfo();
  setUpOwlCarouselPausePlayButtons();
  aiPoseSwitchCheckbox();
});

function Toastify (options) {
  M.toast({html: options.text, classes: options.classes})
}

var Toast = {
  info: (msg) => {
    Toastify({
      text: msg,
      classes: "info-toast"
    })
  },
  notice: (msg) => {
    Toastify({
      text: msg,
      classes: "notice-toast"
    })
  },
  error: (msg) => {
    Toastify({
      text: msg,
      classes: "error-toast"
    })
  }
}
function validator(formData, fields) {
  var keys = Object.keys(formData)
  for (let key of keys) {
    if (fields.indexOf(key) != -1) {
      if (!formData[key]) {
        Toast.error("Please Enter " + key)
        return false
      }
    }
  }
  return true
}

function serializeformData() {
  var formData = $("#form").serializeArray()
  var obj = {}
  for (var item of formData) {
    var key = item.name
    var val = item.value
    obj[key] = val
  }
  return obj
}

function collapsibleInstructorInfo() {
  $('.collapsible').collapsible();
  $('.collapsible-header').click(()=> {
    if ($('.collapsible-info').hasClass('active')) {
      $arrowIconDown.removeClass('hide');
      $arrowIconUp.addClass('hide');
    } else {
      $arrowIconDown.addClass('hide');
      $arrowIconUp.removeClass('hide');
    }
  });
}

/**
 * Pause the carousel from moving
 */
function stopAutoPlayCarousel() {
  clearInterval(carouselAutoplayIntervalId);
}

/**
* go through the carousel every 5 seconds
* default on - option to start again or stop
*/
function autoPlayCarousel() {
  stopAutoPlayCarousel();
  carouselAutoplayIntervalId = setInterval(function () {
    $owlCarouselNew.trigger('next.owl.carousel');
  }, 5000);
}

/**
 * video stream boxes build UI
 * @param {*} id 
 * @param {*} show 
 */
function addView (id, show) {
  let videoLayout = '';
  if (!$("#remote_video_panel_" + id)[0]) {
    videoLayout += `<div id="remote_video_panel_${id}" class="video-view item instructor-video-view">
        <div id="remote_video_${id}" class="video-placeholder-instructor"></div>
        <div id="remote_video_info_${id}" class="video-profile${show ? '' :  ' hide'}"></div>
        <div id="video_autoplay_${id}" class="autoplay-fallback hide"></div>
      </div>`;
    $owlCarouselNew.trigger('add.owl.carousel', [videoLayout]).trigger('refresh.owl.carousel');
    startAutoPlayOwlCarouselView();
    return;
  }
}

/**
 * autoplays when there are more than 2 showing camera
 * else does not start autoplay
 * starts initial join on page load, and when clicking leave then join again
 */
function startAutoPlayOwlCarouselView() {
  if ($('.owl-item').length > 3) {
    autoPlayCarousel();
    $owlCarouselButtonContainer.fadeIn();
  } else {
    stopAutoPlayCarousel();
  }
  $btnStopAutoPlayCarousel.show();
  $btnAutoPlayCarousel.hide();
}

/**
 * html click events to autoplay carousel or stop it
 */
function setUpOwlCarouselPausePlayButtons() {
  $btnAutoPlayCarousel.click(function(e) {
    e.preventDefault();
    $btnAutoPlayCarousel.hide();
    $btnStopAutoPlayCarousel.show();
    autoPlayCarousel();
  });
  $btnStopAutoPlayCarousel.click(function(e) {
    e.preventDefault();
    $btnAutoPlayCarousel.show();
    $btnStopAutoPlayCarousel.hide();
    stopAutoPlayCarousel();
  });
}

/**
 * generates owl carousel with font awesome icon arrows
 * @param {jQueryEl} owlCarouselElement 
 */
function loadOwlCarousel(owlCarouselElement) {
  owlCarouselElement.owlCarousel({
      loop: false,
      rewind: true,
      margin: 10,
      nav: true,
      dots: false,
      navText: ['<i class="fa fa-angle-left" aria-hidden="true"></i>',
      '<i class="fa fa-angle-right" aria-hidden="true"></i>'],
      // autoplay: true,
      // autoplayTimeout: 3000,
      // autoplayHoverPause: true,
      // autoPlaySpeed: 1000,

      lazyLoad: false,
      // lazyLoadEager: 1,
      autoHeight: true,
      responsiveClass: true,
      // stagePadding: 50,
      responsive: {
        0: {
          items: 1.5,
        },
        600: {
          items: 2.5,
          stagePadding: 50,
        },
        1000: {
          items: 2.5,
          //loop: false,
          stagePadding: 50,
        }
      }
  })
}

function removeView (id) {
  var listItem = document.getElementById( "owl-stage" );  
  if ($("#remote_video_panel_" + id)) {
    var index = $($("#remote_video_panel_" + id).parent()).index(listItem);    
    if(index >= 0)
    {
      $(".owl-carousel").trigger('remove.owl.carousel', index).trigger('refresh.owl.carousel');      
    }
  }
}

function getDevices (next) {
  AgoraRTC.getDevices(function (items) {
    items.filter(function (item) {
      return ["audioinput", "videoinput"].indexOf(item.kind) !== -1
    })
    .map(function (item) {
      return {
      name: item.label,
      value: item.deviceId,
      kind: item.kind,
      }
    })
    var videos = []
    var audios = []
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      if ("videoinput" == item.kind) {
        var name = item.label
        var value = item.deviceId
        if (!name) {
          name = "camera-" + videos.length
        }
        videos.push({
          name: name,
          value: value,
          kind: item.kind
        })
      }
      
      if ("audioinput" == item.kind) {
        
        var name = item.label
        var value = item.deviceId
        if (!name) {
          name = "microphone-" + audios.length
        }
        audios.push({
          name: name,
          value: value,
          kind: item.kind
        })
      }
    }
    next({videos: videos, audios: audios})
  })
}

function handleEvents (rtc) {
  // Occurs when an error message is reported and requires error handling.
  rtc.client.on("error", (err) => {
    console.log(err)
  })
  // Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.
  rtc.client.on("peer-leave", function (evt) {
    var id = evt.uid;
    console.log("id", evt)
    let streams = rtc.remoteStreams.filter(e => id !== e.getId())
    let peerStream = rtc.remoteStreams.find(e => id === e.getId())
    if(peerStream && peerStream.isPlaying()) {
      peerStream.stop()
    }
    rtc.remoteStreams = streams
    if (id !== rtc.params.uid) {
      removeView(id)
    }
    Toast.notice("peer leave")
    console.log("peer-leave", id)
  })
  // Occurs when the local stream is published.
  rtc.client.on("stream-published", function (evt) {
    Toast.notice("stream published success")
    console.log("stream-published");                
    setTimeout(function () {
      toggleWebAI(true)
      $owlCarouselNew.trigger('refresh.owl.carousel');
    }, 1000);
  })
  // Occurs when the remote stream is added.
  rtc.client.on("stream-added", function (evt) {  
    var remoteStream = evt.stream
    var id = remoteStream.getId()
    Toast.info("stream-added uid: " + id)
    
      if (id !== rtc.params.uid) {
        rtc.client.subscribe(remoteStream, function (err) {
          console.log("stream subscribe failed", err)
        })
      }
    
    console.log("stream-added remote-uid: ", id)
  })

  rtc.client.on("mute-audio", function (evt) {
    console.log("muting");
  })

  // Occurs when a user subscribes to a remote stream.
  rtc.client.on("stream-subscribed", function (evt) {
    var remoteStream = evt.stream;
    var id = remoteStream.getId();
    rtc.remoteStreams.push(remoteStream)
    addView(id)
    remoteStream.play("remote_video_" + id)
    Toast.info("stream-subscribed remote-uid: " + id)
    console.log("stream-subscribed remote-uid: ", id)
    
  })
  // Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
  rtc.client.on("stream-removed", function (evt) {
    var remoteStream = evt.stream
    var id = remoteStream.getId()
    Toast.info("stream-removed uid: " + id)
    if(remoteStream.isPlaying()) {
      remoteStream.stop()
    }
    rtc.remoteStreams = rtc.remoteStreams.filter(function (stream) {
      return stream.getId() !== id
    })
    removeView(id)
    console.log("stream-removed remote-uid: ", id)
  })
  rtc.client.on("onTokenPrivilegeWillExpire", function(){
    // After requesting a new token
    // rtc.client.renewToken(token);
    Toast.info("onTokenPrivilegeWillExpire")
    console.log("onTokenPrivilegeWillExpire")
  })
  rtc.client.on("onTokenPrivilegeDidExpire", function(){
    // After requesting a new token
    // client.renewToken(token);
    Toast.info("onTokenPrivilegeDidExpire")
    console.log("onTokenPrivilegeDidExpire")
  })
}

/**
* rtc: rtc object
* option: {
*  mode: string, "live" | "rtc"
*  codec: string, "h264" | "vp8"
*  appID: string
*  channel: string, channel name
*  uid: number
*  token; string,
* }
**/
function joining (rtc, option) {
  if (rtc.joined) {
    Toast.error("You already joined")
    return;
  }

  var generateRtcToken = firebase.functions().httpsCallable('generateRtcToken');
    generateRtcToken({className: tmpGroupId, userName: firebase.auth().currentUser.uid}).then(function(result){
        var sanitizedMessage = result.data;
      var app_token = sanitizedMessage;
      console.log(app_token);


      /**
       * A class defining the properties of the config parameter in the createClient method.
       * Note:
       *    Ensure that you do not leave mode and codec as empty.
       *    Ensure that you set these properties before calling Client.join.
       *  You could find more detail here. https://docs.agora.io/en/Video/API%20Reference/web/interfaces/agorartc.clientconfig.html
      **/
      rtc.client = AgoraRTC.createClient({mode: option.mode, codec: option.codec})

      rtc.params = option

      // handle AgoraRTC client event
      handleEvents(rtc)

      // init client
      rtc.client.init(appId, function () {
        console.log("init success")
        /**
         * Joins an AgoraRTC Channel
         * This method joins an AgoraRTC channel.
         * Parameters
         * tokenOrKey: string | null
         *    Low security requirements: Pass null as the parameter value.
         *    High security requirements: Pass the string of the Token or Channel Key as the parameter value. See Use Security Keys for details.
         *  channel: string
         *    A string that provides a unique channel name for the Agora session. The length must be within 64 bytes. Supported character scopes:
         *    26 lowercase English letters a-z
         *    26 uppercase English letters A-Z
         *    10 numbers 0-9
         *    Space
         *    "!", "#", "$", "%", "&", "(", ")", "+", "-", ":", ";", "<", "=", ".", ">", "?", "@", "[", "]", "^", "_", "{", "}", "|", "~", ","
         *  uid: number | null
         *    The user ID, an integer. Ensure this ID is unique. If you set the uid to null, the server assigns one and returns it in the onSuccess callback.
         *   Note:
         *      All users in the same channel should have the same type (number or string) of uid.
         *      If you use a number as the user ID, it should be a 32-bit unsigned integer with a value ranging from 0 to (232-1).
        **/

        rtc.client.join(app_token, tmpGroupId, userid, function (uid) {
          //Toast.notice("join channel: " + tmpGroupId + " success, uid: " + uid)
          console.log("join channel: " + tmpGroupId + " success, uid: " + uid)
          rtc.joined = true

          rtc.params.uid = uid;
          // create local stream
          rtc.localStream = AgoraRTC.createStream({
            streamID: rtc.params.uid,
            audio: false,
            video: true,
            screen: false,
            //microphoneId: option.microphoneId,
            cameraId: option.cameraId
          })

          // init local stream
          rtc.localStream.init(function () {
            console.log("init local stream success")
            // play stream with html element id "local_stream"
            rtc.localStream.muteAudio()
            rtc.localStream.play("local_stream")

            // publish local stream
            publish(rtc);


          }, function (err)  {
            Toast.error("stream init failed, please open console see more detail")
            console.error("init local stream failed ", err)
          })
        }, function(err) {
          Toast.error("client join failed, please open console see more detail")
          console.error("client join failed", err)
        })
      }, (err) => {
        Toast.error("client init failed, please open console see more detail")
        console.error(err)
      })
    });

}

function publish (rtc) {
  if (!rtc.client) {
    Toast.error("Please Join Room First")
    return
  }
  if (rtc.published) {
    Toast.error("You are already published")
    return
  }
  var oldState = rtc.published

  // publish localStream
  rtc.client.publish(rtc.localStream, function (err) {
    rtc.published = oldState
    console.log("publish failed")
    Toast.error("publish failed")
    console.error(err)
  })
  Toast.info("publish")
  rtc.published = true
}

function unpublish (rtc) {
  if (!rtc.client) {
    Toast.error("Please Join Room First")
    return
  }
  if (!rtc.published) {
    Toast.error("You did not publish")
    return
  }
  var oldState = rtc.published
  rtc.client.unpublish(rtc.localStream, function (err) {
    rtc.published = oldState
    console.log("unpublish failed")
    Toast.error("unpublish failed")
    console.error(err)
  })
  Toast.info("unpublish")
  rtc.published = false
}

function leave (rtc) {
  if (!rtc.client) {
    Toast.error("Please Join First!")
    return
  }
  if (!rtc.joined) {
    Toast.error("You are not in channel")
    return
  }

  /**
   * Leaves an AgoraRTC Channel
   * This method enables a user to leave a channel.
   **/
  rtc.client.leave(function () {

    // stop stream        
    if(rtc.localStream.isPlaying()) {
      rtc.localStream.stop()
    }
    // close stream
    rtc.localStream.close()
    for (let i = 0; i < rtc.remoteStreams.length; i++) {
      var stream = rtc.remoteStreams.shift()
      var id = stream.getId()
      if(stream.isPlaying()) {
        stream.stop()
      }
      removeView(id)
    }
    rtc.localStream = null
    rtc.remoteStreams = []
    rtc.client = null
    console.log("client leaves channel success")
    rtc.published = false
    rtc.joined = false
    Toast.notice("leave success")

    $owlCarouselNew.trigger('destroy.owl.carousel');
    $owlCarouselButtonContainer.fadeOut();

  }, function (err) {
    console.log("channel leave failed")
    Toast.error("leave success")
    console.error(err)
  })
}


function getMeta(metaName) {
  const metas = document.getElementsByTagName('meta');

  for (let i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute('name') === metaName) {
      return metas[i].getAttribute('content');
    }
  }

  return '';
}

$(function () {
getDevices(function (devices) {
  devices.audios.forEach(function (audio) {
    $("<option/>", {
      value: audio.value,
      text: audio.name,
    }).appendTo("#microphoneId")
  })
  devices.videos.forEach(function (video) {
    $("<option/>", {
      value: video.value,
      text: video.name,
    }).appendTo("#cameraId")
  })
  resolutions.forEach(function (resolution) {
    $("<option/>", {
      value: resolution.value,
      text: resolution.name
    }).appendTo("#cameraResolution")
  })
  M.AutoInit()
})

var fields = []

$("#join").on("click", function (e) {
  console.log("join")
  e.preventDefault()
  var params = serializeformData()
  params.mode = 'live';
  params.codec = 'h264';
  if (validator(params, fields)) {
    join(rtc, params)
  }
  // scroll to the bottom of the page
  // $('html, body').animate({scrollTop:$(document).height()}, 'slow');
  // $('.instructor-video-text').css('display', 'none');
  $('.student-local-stream').fadeIn();
})

$("#publish").on("click", function (e) {
  console.log("publish")
  e.preventDefault()
  var params = serializeformData()
  if (validator(params, fields)) {
    publish(rtc)
  }
})

$("#unpublish").on("click", function (e) {
  console.log("unpublish")
  e.preventDefault()
  var params = serializeformData()
  if (validator(params, fields)) {
    unpublish(rtc)
  }
})

$("#leave").on("click", function (e) {
  console.log("leave")
  e.preventDefault()
  var params = serializeformData()
  if (validator(params, fields)) {
    leave(rtc)
  }
})
})

function toggleWebAI(isOn)
{
  $('meta[name=useai]').remove();
  $('head').append( '<meta name="useai" content="' + isOn.toString() + '">' );

  if(isOn)
  {
    $('#video' + userid).css("visibility", "hidden");
    $('#video' + userid).css("position", "absolute");
    $('#image').show();
    $('#output').show();
    detectPoseInRealTime();
  }
  else
  {
    $('#video' + userid).css("visibility", "visible");
    $('#video' + userid).css("position", "relative");
    $('#image').hide();
    $('#output').hide();
  }
}

function join()
{

  var params = serializeformData();
  params.mode = 'live';
  params.codec = 'h264';
  joining(rtc, params)
  // scroll to the bottom of the page
  // $('html, body').animate({scrollTop:$(document).height()}, 'slow');
  // $('.instructor-video-text').css('display', 'none');
  $('.student-local-stream').fadeIn();
  loadOwlCarousel($owlCarouselNew);

  startAutoPlayOwlCarouselView();
}

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
      boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
      boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
        scale, ctx);
  });
}

/**
 * Draw pose keypoints onto a canvas
 */
function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const {y, x} = keypoint.position;
    drawPoint(ctx, y * scale, x * scale, 3, color);
  }
}

function toTuple({y, x}) {
  return [y, x];
}

async function detectPoseInRealTime() {

  if(!JSON.parse(getMeta("useai")))
  {      
    return;
  }

  var videoid = 'video' + userid;
  const videoidjq = '#video' + userid;
  const video = document.getElementById(videoid);
  const canvas = document.getElementById('output');
  const image = document.getElementById('image');
  if(video != null)
  {          
    $( "#image" ).insertAfter(videoidjq);
    image.setAttribute("width", $(videoidjq).width());
    image.setAttribute("height", 220);
        
    $( "#output" ).insertAfter(videoidjq);
    canvas.setAttribute("width", 320);
    canvas.setAttribute("height", $(videoidjq).height());

    $(videoidjq).css("visibility", "hidden");
    $( "#image" ).css("visibility", "hidden");
  }
  else
  {
    return;
  }


  const ctx = canvas.getContext('2d');
  const imagectx = image.getContext('2d');
  const net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: $(videoidjq).width(), height: $(videoidjq).height()},
    multiplier: 0.75
  });

  async function poseDetectionFrame() {    
    if(!JSON.parse(getMeta("useai")))
    {      
      return;
    }
    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;

    imagectx.clearRect(0, 0, $('#output').width(), $('#output').height());

    imagectx.save();
    imagectx.scale(-1, 1);
    imagectx.translate(-$('#output').width(), 0);
    imagectx.drawImage(video, 0, 0, $('#output').width(), $('#output').height());
    imagectx.restore();

      const pose = await net.estimatePoses(image, {
            flipHorizontal: false,
            decodingMethod: 'single-person'
          });

    ctx.clearRect(0, 0, $('#output').width(), $('#output').height());

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-$('#output').width(), 0);
    ctx.drawImage(video, 0, 0, $('#output').width(), $('#output').height());
    ctx.restore();

      poses = poses.concat(pose);
      minPoseConfidence = + 0.15;
      minPartConfidence = + 0.1;
          // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores
      poses.forEach(({score, keypoints}) => {
        
        if (score >= minPoseConfidence) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
          drawSkeleton(keypoints, minPartConfidence, ctx);
          /*
          if (guiState.output.showBoundingBox) {
            drawBoundingBox(keypoints, ctx);
          }*/
        }
      });
      requestAnimationFrame(poseDetectionFrame);
    

  }
  poseDetectionFrame();
  setTimeout(function () {
    $owlCarouselNew.trigger('refresh.owl.carousel');
  }, 1500);
}

function aiPoseSwitchCheckbox() {
  // Get the checkbox
  const $aiPoseSwitchCheckbox = $("#ai-pose-switch-checkbox");
  // If the checkbox is checked, display the AI
  $aiPoseSwitchCheckbox.click(function(){
    // if ($aiPoseSwitchCheckbox.prop('checked') == true){
    if($(this).is(":checked")){
      toggleWebAI(true);
    } else {
      toggleWebAI(false);
    }
  });
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  // TODO 4: Return the user's profile pic URL.
    return firebase.auth().currentUser.photoURL || '/img/profile_placeholder.png';
}


// Returns the signed-in user's display name.
function getUserName() {
  // TODO 5: Return the user's display name.
  return firebase.auth().currentUser.displayName;
}

// Returns the signed-in user's display name.
function getUserId() {
  // TODO 5: Return the user's display name.
  return firebase.auth().currentUser.uid;
}


// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    userid = user.uid;
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

    // We save the Firebase Messaging Device token and enable notifications.
    join();
  }
  else
  {
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');  
    location.href="/index.html";
  }
}
// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// Initiate firebase auth.
function initFirebaseAuth() {
  // TODO 3: Initialize Firebase.
    firebase.auth().onAuthStateChanged(authStateObserver);
}

initFirebaseAuth();

var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signOutButtonElement = document.getElementById('sign-out');
var signInButtonElement = document.getElementById('sign-in');

signOutButtonElement.addEventListener('click', signOut);

// Signs-out of Demo.
function signOut() {
  // TODO 2: Sign out of Firebase.
  firebase.auth().signOut().then(function() {
    // Sign-out successful.
    console.log('signed out');
    location.href="/index.html";
  }, function(error) {
      // An error happened.
      console.log('error: ', error);
  });
}