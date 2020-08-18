$(document).ready(function() {
    checkCookiesStats();
    // As httpOnly cookies are to be used, do not persist any state client side.
    //firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

});

/**
 * @param {string} name The cookie name.
 * @return {?string} The corresponding cookie value to lookup.
 */
function getCookie(name) {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}


function handleSignUpSubmit(e) {
    e.preventDefault();

    var errors = document.getElementById('errors');
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var confirmpassword = document.getElementById('password_confirm').value;
    var name = document.getElementById('name').value;
    var note = document.getElementById('note').value;
    // var userDisplayName = document.getElementById('user-display-name').value;
    var warnings = "";

    if (!ValidateEmail(email)) {
        warnings += 'You need a valid email.<br/>';
    }
    if (password.length < 8) {
        warnings += 'Password needs to be at least 8 characters long.<br/>';
    }
    if(password != confirmpassword)
    {
        warnings += 'Password is not the same.<br/>';   
    }
    if (name.length < 3) {
        warnings += 'Name is not valid. <br/>';
    }
    // if (userDisplayName.length < 4) {
    //     warnings += 'You need a valid display name<br/>';
    // }
    
    if (warnings != "") {
        console.log(warnings);
        errors.style.display = 'block';
        errors.innerHTML = warnings;
    } else {
        isSignUpProcess = true;
        errors.style.display = "none";
        firebase.auth().createUserWithEmailAndPassword(email, password)
       .then(function(firebaseUser) {
           // Success         
           console.log(firebaseUser);
            var user = firebase.auth().currentUser;
            console.log(user);
            user.updateProfile({
                displayName: name,
                // photoURL: "http://sarahjhan.design/explorations/Sound-Visualizer/images/japanImages/image4.JPG"
                }).then(function() {
                    // Update successful.

                    var firestore = firebase.firestore();
                    var userRef = firestore.collection("Users").doc(user.uid);

                    var docData = {
                        DisplayName: name,
                        Email: email,
                        UserId: user.uid,
                        Note: note
                    }
                    userRef.set(docData)
                    .then(function(docRef) {
                        //console.log("Document written with ID: ", docRef.id);
                        location.href="/upcoming/";                    
                    }).catch(function(error) {
                        console.error("Error adding document: ", error);
                        alert("Error adding document: ", error);
                    });

                    console.log('updated');
                    console.log(user);
                }).catch(function(error) {
                // An error happened.
                    console.log('error!~', error);
            });
       })
        .catch(function(error) {
            errors.style.display = (errors.style.display === "none" || errors.style.display === "") ? "block" : "none";
            console.log(error);
            errors.innerHTML = error + "<br/>";

        });
    }
}


// Signs-in MixPose.
function handleGoogleSignIn(event) {
  //alert('TODO: Implement Google Sign-In');
  // TODO 1: Sign in Firebase with credential from the Google user.
    // Sign into Firebase using popup auth & Google as the identity provider.
  event.preventDefault();
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithRedirect(provider);
}


function handleSignOut() {
    $('#signout').click(function() {
        console.log('clicked sign out');
        signOut();
    });
}

function ValidateEmail(mail) 
{
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
    {
        return (true)
    }
    return (false)
}

// Initiate firebase auth.
function initFirebaseAuth() {
  // TODO 3: Initialize Firebase.
    firebase.auth().onAuthStateChanged(authStateObserver);
}


// Once a user is created with the email/login
// Notify when he/she is logged in
function authStateObserver(user) {
    // get a user's profile information
    if (user && !isSignUpProcess) {
        console.log('user', user);
        // User is signed in.
        var name = user.displayName;
        var email = user.email;
        var photoUrl = user.photoURL;
        var note = user.Note;

        var emailVerified = user.emailVerified;
        var uid = user.uid;

        var success = document.getElementById('success');

        var firestore = firebase.firestore();
        var userRef = firestore.collection("Users").doc(uid);
        var getOptions = {
            source: 'default'
        };

        userRef.get(getOptions).then(function(doc) {
            var userData = doc.data();
            if(userData == null)
            {
                var docData = {
                        DisplayName: name,
                        Email: email,
                        UserId: uid,
                        PhotoUrl: photoUrl
                    }
                userRef.set(docData)
                .then(function(docRef) {
                    loginAfterAuth(user);
                }).catch(function(error) {
                    console.error("Error adding document: ", error);
                    alert("Error adding document: ", error);
                });

            }
            else
            {
                loginAfterAuth(user);
            }
            
          }).catch(function(error) {
            console.log("Error getting document:", error);
          });
    } else {
        // No user is signed in.
        //console.log('foo bar');

    }
}

function loginAfterAuth(user)
{
    location.href="/class.html";
}


firebase.auth().getRedirectResult().then(function(result) {
  if (result.credential) {
        // This gives you a Google Access Token. You can use it to access the Google API.
        var token = result.credential.accessToken;
        // ...
        // Sign in with credential from the Google user.
            var credential = firebase.auth.GoogleAuthProvider.credential(token);            
            firebase.auth().signInWithCredential(credential).catch(function(error) {
              // Handle Errors here.
              var errorCode = error.code;
              var errorMessage = error.message;
              // The email of the user's account used.
              var email = error.email;
              // The firebase.auth.AuthCredential type that was used.
              var credential = error.credential;
              // ...
                firebase.database().ref('ErrorLog').push().set(
                  {
                    Error: "firebase.auth().signInWithCredential(credential)",
                    Type: "WebLoginsignInWithCredential",
                    TimeStamp: firebase.database.ServerValue.TIMESTAMP,
                    ErrorCode: errorCode,
                    ErrorMessage: errorMessage
                  }
                );
            });
        }
        // The signed-in user info.
        //var user = result.user;
        //console.log(result);
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
      firebase.database().ref('ErrorLog').push().set(
      {
        Error: "firebase.auth().getRedirectResult()",
        Type: "WebLoginsignInWithRedirect",
        TimeStamp: firebase.database.ServerValue.TIMESTAMP,
        ErrorCode: errorCode,
        ErrorMessage: errorMessage
        }
    );
});

// current user status
var isSignUpProcess = false;
var user = firebase.auth().currentUser;
var storage = firebase.storage();
var btnGoogleSignIn = document.getElementById('google-sign-in');

if (user) {
    // User is signed in.
    console.log('user is signed in');
} else {
    // No user is signed in.
    console.log('user is not signed in');
}

btnGoogleSignIn.addEventListener('click', handleGoogleSignIn);

initFirebaseAuth();

function checkCookiesStats() {
    if (!navigator.cookieEnabled) {
        $('#cookieModal').modal({
            endingTop: '25%', // Ending top style attribute
        }).modal('open');
    }
}