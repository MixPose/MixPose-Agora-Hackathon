const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

$(document).ready(function() {
    detectIos();
    navbarStudentTeacher();
});

$(function () {
    // support/contact email local client
    $('.contact-email').click(function (e) {
        const email = 'contact@mixpose.com';
        const subject = 'MixPose - Contact';
        const emailBody = 'Hi...';
        window.open("mailto:"+email+"?subject="+subject+"&body="+emailBody);
    });
});

/**
 * detect if iOS
 */
function detectIos() {
    if ($('.mixpose-theme').hasClass('login-page') ||
        $('.mixpose-theme').hasClass('forgotpassword-page') ||
        $('.mixpose-theme').hasClass('signup-page') ||
        $('.mixpose-theme').hasClass('event-page') ||
        $('.mixpose-theme').hasClass('lesson-page') ||
        $('.mixpose-theme').hasClass('classinfo-page')) {
        if (isIOS) { // iPad|iPhone|iPod
            // open modal and provide option to download app or go to mixpose.com on desktop browser
            $('#iosModal').modal({
            endingTop: '25%', // Ending top style attribute
            }).modal('open');
        }
    }
}

/**
 * clicking the logo goes to 
 * schedule page for students
 * dashboard for teachers
 */
function navbarStudentTeacher() {
    $('.mixpose-navbar-logo').click(function() {
        if (window.location.href.indexOf('classinfo') > -1) {
            location.assign('/dashboard/');
        } else if ((window.location.href.indexOf('login') > -1) ||
            (window.location.href.indexOf('signup') > -1) ||
            (window.location.href.indexOf('forgotpassword') > -1))
        {
            location.assign('/');
        } else {
            location.assign('/profile/');
        }
    });
}

/**
 * get meta tag of information
 */
function getMeta(metaName) {
  const metas = document.getElementsByTagName('meta');

  for (let i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute('name') === metaName) {
      return metas[i].getAttribute('content');
    }
  }

  return '';
}