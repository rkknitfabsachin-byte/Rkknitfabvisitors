// CONFIGURATION: Replace this with your deployed Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycGf6pkRjZE-F8GLaAFkXh1UhNiFNkUHMH3BOVCeaMqqH7LBFKxh4rrZllJwafcjFOuQ/exec';

// Optional: Banner Configuration
const showBanner = false; // Set to true to show the holiday banner

document.addEventListener('DOMContentLoaded', () => {
    let currentCheckInId = null; // Store the ID received from Apps Script

    // 1. Handle Banner
    const banner = document.getElementById('holidayBanner');
    if (showBanner && banner) {
        banner.style.display = 'block';
    }

    // 2. Load Returning Visitor Profiles
    loadProfiles();

    // 3. Handle Form Submission
    const form = document.getElementById('checkInForm');
    form.addEventListener('submit', handleFormSubmit);
});

function loadProfiles() {
    const profilesDiv = document.getElementById('returningProfiles');
    const section = document.getElementById('returningVisitorSection');

    // Retrieve profiles from local storage
    const savedProfiles = JSON.parse(localStorage.getItem('rk_visitor_profiles')) || [];

    if (savedProfiles.length > 0) {
        section.style.display = 'block';
        profilesDiv.innerHTML = '';

        savedProfiles.forEach((profile, index) => {
            const chip = document.createElement('div');
            chip.className = 'profile-chip';
            chip.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <span>${profile.fullName} (${profile.company})</span>
            `;
            chip.onclick = () => fillFormWithProfile(profile);
            profilesDiv.appendChild(chip);
        });
    } else {
        section.style.display = 'none';
    }
}

function fillFormWithProfile(profile) {
    document.getElementById('fullName').value = profile.fullName || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('address').value = profile.address || '';
    document.getElementById('company').value = profile.company || '';

    // Scroll to form slightly
    document.querySelector('.form-group').scrollIntoView({ behavior: 'smooth' });
}

function saveProfile(formData) {
    let savedProfiles = JSON.parse(localStorage.getItem('rk_visitor_profiles')) || [];

    // Create new profile object
    const newProfile = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        company: formData.get('company')
    };

    // Remove old exact matches to avoid duplicates (based on phone/name)
    savedProfiles = savedProfiles.filter(p => p.phone !== newProfile.phone);

    // Add to beginning and keep max 5 profiles
    savedProfiles.unshift(newProfile);
    if (savedProfiles.length > 5) savedProfiles.pop();

    localStorage.setItem('rk_visitor_profiles', JSON.stringify(savedProfiles));
}

function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    // UI Updates
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('loader').style.display = 'block';

    // Save for returning visit
    saveProfile(formData);

    const payload = new URLSearchParams();
    payload.append('action', 'checkin');

    // Append standard form fields
    for (const [key, value] of formData.entries()) {
        payload.append(key, value);
    }

    // Set default category to Pending for admin to review on checkout
    payload.append('category', 'Pending');

    // Handle "Who do you want to meet" field manually
    const meetWhoSelect = document.getElementById('meetWho');
    let meetWhoValue = meetWhoSelect.value;
    if (meetWhoValue === 'Other') {
        meetWhoValue = document.getElementById('meetWhoOther').value;
    }
    payload.append('meetWho', meetWhoValue);

    sendDataToScript(payload, form);
}

function handleMeetWhoChange(select) {
    const otherInput = document.getElementById('meetWhoOther');
    if (select.value === 'Other') {
        otherInput.style.display = 'block';
        otherInput.required = true;
        otherInput.focus();
    } else {
        otherInput.style.display = 'none';
        otherInput.required = false;
    }
}

function sendDataToScript(payload, form) {
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString()
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('loader').style.display = 'none';
                // Hide all form groups
                const groups = form.querySelectorAll('.form-group');
                groups.forEach(g => g.style.display = 'none');
                // Hide header
                document.querySelector('.branding').style.display = 'none';
                document.getElementById('returningVisitorSection').style.display = 'none';
                // Show success message
                document.getElementById('successMessage').style.display = 'block';

                // Save the ID for social click tracking
                window.currentCheckInId = data.id;
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            alert('There was an error saving your check-in. Please try again.');
            document.getElementById('submitBtn').style.display = 'flex';
            document.getElementById('loader').style.display = 'none';
        });
}

function trackSocialClick(type) {
    if (!window.currentCheckInId) return; // Cannot track if ID is missing

    const payload = new URLSearchParams();
    payload.append('action', 'socialClick');
    payload.append('id', window.currentCheckInId);
    payload.append('type', type);

    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString()
    }).catch(e => console.error("Tracking Error:", e));
}
