const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signInForm = document.getElementById('signIn');
const signUpForm = document.getElementById('signup');
const signupSubmit = document.getElementById('signup-submit');
const signinSubmit = document.getElementById('signin-submit');
const signupError = document.getElementById('signup-error');
const signinError = document.getElementById('signin-error');

// Toggle between signin and signup forms
signUpButton.addEventListener('click', function() {
    signInForm.style.display = 'none';
    signUpForm.style.display = 'block';
    signinError.textContent = '';
    signupError.textContent = '';
});

signInButton.addEventListener('click', function() {
    signInForm.style.display = 'block';
    signUpForm.style.display = 'none';
    signinError.textContent = '';
    signupError.textContent = '';
});

// Validate email format
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password (minimum 8 characters)
function isValidPassword(password) {
    return password.length >= 8;
}

// Handle signup form submission
document.querySelector('#signup form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const fName = document.querySelector('#signup-fName').value.trim();
    const lName = document.querySelector('#signup-lName').value.trim();
    const email = document.querySelector('#signup-email').value.trim();
    const password = document.querySelector('#signup-password').value;

    // Client-side validation
    if (!fName || !lName) {
        signupError.textContent = 'First and last names are required.';
        return;
    }
    if (!isValidEmail(email)) {
        signupError.textContent = 'Please enter a valid email address.';
        return;
    }
    if (!isValidPassword(password)) {
        signupError.textContent = 'Password must be at least 8 characters long.';
        return;
    }

    signupSubmit.disabled = true;
    signupError.textContent = '';

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fName, lName, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            signupError.textContent = 'Signup successful! Please sign in.';
            signInForm.style.display = 'block';
            signUpForm.style.display = 'none';
            document.querySelector('#signup form').reset();
        } else {
            signupError.textContent = data.message || 'Signup failed.';
        }
    } catch (error) {
        signupError.textContent = 'Error: Unable to connect to the server.';
    } finally {
        signupSubmit.disabled = false;
    }
});

// Handle signin form submission
document.querySelector('#signIn form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.querySelector('#signin-email').value.trim();
    const password = document.querySelector('#signin-password').value;

    // Client-side validation
    if (!isValidEmail(email)) {
        signinError.textContent = 'Please enter a valid email address.';
        return;
    }
    if (!isValidPassword(password)) {
        signinError.textContent = 'Password must be at least 8 characters long.';
        return;
    }

    signinSubmit.disabled = true;
    signinError.textContent = '';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            window.location.href= '/home';
        } else {
            signinError.textContent = data.message || 'Signin failed.';
        }
    } catch (error) {
        signinError.textContent = 'Error: Unable to connect to the server.';
    } finally {
        signinSubmit.disabled = false;
    }
});