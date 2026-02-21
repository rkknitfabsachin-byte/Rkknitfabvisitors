// CONFIGURATION: Replace this with your deployed Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycGf6pkRjZE-F8GLaAFkXh1UhNiFNkUHMH3BOVCeaMqqH7LBFKxh4rrZllJwafcjFOuQ/exec';

// Preloaded WhatsApp contacts for staff members (include country code, no '+')
const STAFF_DIRECTORY = {
    "Kartik Sir": "919914166611",
    "Mohit Sir": "919814025089",
    "Neelam Sharma": "917087079969",
    "Ritu": "917087011671",
    "Muskan Ma'am": "919056027427"
};

document.addEventListener('DOMContentLoaded', () => {
    fetchActiveVisitors();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchActiveVisitors();
        });
    }
});

function fetchActiveVisitors() {
    if (SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL') {
        const tableBody = document.getElementById('visitorsTableBody');
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error: Please set the SCRIPT_URL in js/admin.js to your deployed Google Apps Script Web App URL.</td></tr>`;
        return;
    }

    const loader = document.getElementById('adminLoader');
    loader.style.display = 'block';

    fetch(`${SCRIPT_URL}?action=getActive`)
        .then(response => response.json())
        .then(data => {
            loader.style.display = 'none';
            if (data.status === 'success') {
                renderTable(data.data);
                updateStats(data.data);
            } else {
                throw new Error(data.message || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching visitors:', error);
            loader.style.display = 'none';
            const tableBody = document.getElementById('visitorsTableBody');
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error loading data. Please check connection and try again.</td></tr>`;
        });
}

function updateStats(visitors) {
    document.getElementById('statTotal').innerText = visitors.length;

    let clients = 0;
    let otherVisitors = 0;
    let ratedCount = 0;
    let followedCount = 0;

    visitors.forEach(v => {
        if (v[4] === 'Client') clients++; // v[4] is Category in array from GS
        else if (v[4] === 'Visitor') otherVisitors++;

        if (v[6] === 'Yes') ratedCount++; // v[6] is Rated on Google
        if (v[7] === 'Yes') followedCount++; // v[7] is Followed Instagram
    });

    document.getElementById('statClients').innerText = clients;
    document.getElementById('statVisitors').innerText = otherVisitors;
    document.getElementById('statRated').innerText = ratedCount;
    document.getElementById('statFollowed').innerText = followedCount;
}

function renderTable(visitors) {
    const tableBody = document.getElementById('visitorsTableBody');
    tableBody.innerHTML = '';

    if (!visitors || visitors.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No active visitors at the moment.</td></tr>`;
        return;
    }

    // Google Script Array structure now: [rowNumber, timestamp, fullName, company, category, meetWho, rated, followed]
    visitors.forEach(visitor => {
        const rowId = visitor[0];
        const timeIn = new Date(visitor[1]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const name = visitor[2];
        const company = visitor[3];
        const category = visitor[4];
        const meetWho = visitor[5];
        const rated = visitor[6] === 'Yes';
        const followed = visitor[7] === 'Yes';

        const tr = document.createElement('tr');
        tr.className = 'table-row';
        tr.innerHTML = `
            <td><i class="far fa-clock" style="color: #64748b; margin-right: 5px;"></i> ${timeIn}</td>
            <td style="font-weight: 500;">${name}</td>
            <td>${company}</td>
            <td><span class="badge badge-${category.toLowerCase()}">${category}</span></td>
            <td>${meetWho}</td>
            <td>
                ${rated ? '<i class="fab fa-google" style="color: #16a34a; margin-right: 5px;" title="Rated"></i>' : '<i class="fab fa-google" style="color: #cbd5e1; margin-right: 5px;" title="Not Rated"></i>'}
                ${followed ? '<i class="fab fa-instagram" style="color: #ea580c;" title="Followed"></i>' : '<i class="fab fa-instagram" style="color: #cbd5e1;" title="Not Followed"></i>'}
            </td>
            <td style="display: flex; gap: 8px;">
                <button class="checkout-btn" onclick="checkoutVisitor('${rowId}', this)">
                    Check Out
                </button>
                ${STAFF_DIRECTORY[meetWho] ? `
                <a href="https://wa.me/${STAFF_DIRECTORY[meetWho]}?text=Hi, ${encodeURIComponent(name)} from ${encodeURIComponent(company)} is here to meet you." target="_blank" class="action-btn wa-notify-btn" title="Notify via WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </a>` : ''}
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function checkoutVisitor(rowId, btnElement) {
    if (!confirm('Are you sure you want to check out this visitor?')) return;

    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const payload = new URLSearchParams();
    payload.append('action', 'checkout');
    payload.append('rowId', rowId);

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
                fetchActiveVisitors(); // Refresh the list
            } else {
                throw new Error(data.message || 'Error updating checkout');
            }
        })
        .catch(error => {
            console.error('Checkout error:', error);
            alert('Failed to checkout. Try again.');
            btnElement.disabled = false;
            btnElement.innerHTML = 'Check Out';
        });
}
