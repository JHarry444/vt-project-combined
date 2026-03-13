// API Configuration
const API_BASE = '/api';

// Global state
let currentUser = null;
let selectedRoom = null;
let bookingData = {};
let authToken = null;

// Initialize app
$(document).ready(function () {
    // Load token from localStorage if it exists
    authToken = localStorage.getItem('authToken');
    checkAuthStatus();
    setupEventListeners();
    setMinDates();
});

// Set minimum dates to today
function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    $('#checkInDate').attr('min', today);
    $('#checkOutDate').attr('min', today);
}

// Check if user is authenticated
function checkAuthStatus() {
    if (!authToken) {
        updateNavigation(false);
        return;
    }

    $.ajax({
        url: `${API_BASE}/auth/authenticated`,
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        success: function (response) {
            if (response.authenticated) {
                loadCurrentUser();
            } else {
                clearAuth();
            }
        },
        error: function () {
            clearAuth();
        }
    });
}

// Load current user info
function loadCurrentUser() {
    $.ajax({
        url: `${API_BASE}/auth/user`,
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        success: function (user) {
            currentUser = user;
            updateNavigation(true);
        },
        error: function () {
            clearAuth();
        }
    });
}

// Clear authentication data
function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateNavigation(false);
}

// Update navigation based on auth status
function updateNavigation(isAuthenticated) {
    if (isAuthenticated) {
        $('#loginBtn').hide();
        $('#bookingsBtn').show();
        $('#logoutBtn').show();
    } else {
        $('#loginBtn').show();
        $('#bookingsBtn').hide();
        $('#logoutBtn').hide();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    $('#homeBtn').click(function () { showPage('homePage'); });
    $('#roomsBtn').click(function () {
        showPage('roomsPage');
        loadRooms();
    });
    $('#bookingsBtn').click(function () {
        showPage('bookingsPage');
        loadUserBookings();
    });
    $('#loginBtn').click(function () { showPage('loginPage'); });
    $('#logoutBtn').click(logout);
    $('#getStartedBtn').click(function () { showPage('loginPage'); });

    // Login Form
    $('#loginFormElement').submit(handleLogin);
    $('#registerFormElement').submit(handleRegister);

    // Rooms Page
    $('#searchBtn').click(searchRooms);

    // Booking Form
    $('#bookingForm').submit(handleBooking);

    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    $('#checkInDate').val(today.toISOString().split('T')[0]);
    $('#checkOutDate').val(tomorrow.toISOString().split('T')[0]);
}

// Page Navigation
function showPage(pageId) {
    $('.page').removeClass('active');
    $('#' + pageId).addClass('active');

    // Scroll to top
    $('html, body').animate({ scrollTop: 0 }, 300);
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();

    const username = $('#loginUsername').val();
    const password = $('#loginPassword').val();
    const errorDiv = $('#loginError');

    $.ajax({
        url: `${API_BASE}/auth/login`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password }),
        success: function (response) {
            // Store JWT token
            authToken = response.tkn;
            localStorage.setItem('authToken', authToken);

            currentUser = response.user;
            updateNavigation(true);
            errorDiv.hide();
            $('#loginFormElement')[0].reset();
            showPage('homePage');
            showAlert('Welcome back, ' + currentUser.fullName + '!', 'success');
        },
        error: function (xhr) {
            const error = xhr.responseJSON?.error || 'Login failed';
            errorDiv.text(error).show();
        }
    });
}

function handleRegister(e) {
    e.preventDefault();

    const username = $('#regUsername').val();
    const fullName = $('#regFullName').val();
    const email = $('#regEmail').val();
    const phone = $('#regPhone').val();
    const password = $('#regPassword').val();
    const confirmPassword = $('#regConfirmPassword').val();
    const errorDiv = $('#registerError');
    const successDiv = $('#registerSuccess');

    errorDiv.hide();
    successDiv.hide();

    $.ajax({
        url: `${API_BASE}/auth/register`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password, confirmPassword, email, fullName, phone }),
        success: function (response) {
            successDiv.text('Account created successfully! Please login.').show();
            $('#registerFormElement')[0].reset();
            setTimeout(function () {
                $('#loginTab').tab('show');
            }, 1500);
        },
        error: function (xhr) {
            const error = xhr.responseJSON?.error || 'Registration failed';
            errorDiv.text(error).show();
        }
    });
}

function logout() {
    $.ajax({
        url: `${API_BASE}/auth/logout`,
        type: 'POST',
        headers: authToken ? {
            'Authorization': `Bearer ${authToken}`
        } : {},
        success: function () {
            clearAuth();
            showPage('homePage');
            showAlert('Logged out successfully', 'info');
        },
        error: function () {
            // Even if request fails, clear local auth
            clearAuth();
            showPage('homePage');
            showAlert('Logged out successfully', 'info');
        }
    });
}

// Rooms Functions
function loadRooms() {
    $.ajax({
        url: `${API_BASE}/rooms`,
        type: 'GET',
        success: function (rooms) {
            displayRooms(rooms);
        }
    });
}

function displayRooms(rooms) {
    const roomsList = $('#roomsList');
    roomsList.empty();

    if (rooms.length === 0) {
        roomsList.html('<div class="col-12"><div class="empty-state"><h3>No rooms available</h3></div></div>');
        return;
    }

    rooms.forEach(room => {
        const amenities = room.amenities.map(a => `<span class="amenity-badge">${a}</span>`).join('');
        const roomHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="room-card">
                    <div class="room-image">🛏️ ${room.type}</div>
                    <div class="room-content">
                        <h5>Room ${room.number}</h5>
                        <p><strong>Type:</strong> ${room.type}</p>
                        <p><strong>Capacity:</strong> ${room.capacity} guests</p>
                        <div class="room-amenities">${amenities}</div>
                        <div class="room-price">$${room.price}/night</div>
                        <button class="btn btn-primary" onclick="selectRoom('${room.id}')">View Details</button>
                    </div>
                </div>
            </div>
        `;
        roomsList.append(roomHtml);
    });
}

function selectRoom(roomId) {
    $.ajax({
        url: `${API_BASE}/rooms/${roomId}`,
        type: 'GET',
        success: function (room) {
            selectedRoom = room;
            showRoomModal(room);
        }
    });
}

function showRoomModal(room) {
    const amenities = room.amenities.map(a => `<li>${a}</li>`).join('');
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>Room Details</h6>
                <p><strong>Room Number:</strong> ${room.number}</p>
                <p><strong>Type:</strong> ${room.type}</p>
                <p><strong>Capacity:</strong> ${room.capacity} guests</p>
                <p><strong>Price:</strong> $${room.price} per night</p>
            </div>
            <div class="col-md-6">
                <h6>Amenities</h6>
                <ul>${amenities}</ul>
            </div>
        </div>
    `;

    $('#roomModalTitle').text(`${room.type} - Room ${room.number}`);
    $('#roomDetails').html(detailsHtml);

    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

function searchRooms() {
    if (!currentUser) {
        showAlert('Please login to book a room', 'warning');
        showPage('loginPage');
        return;
    }

    const checkIn = $('#checkInDate').val();
    const checkOut = $('#checkOutDate').val();

    if (!checkIn || !checkOut) {
        showAlert('Please select check-in and check-out dates', 'warning');
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showAlert('Check-out date must be after check-in date', 'warning');
        return;
    }

    $.ajax({
        url: `${API_BASE}/rooms/available?checkIn=${checkIn}&checkOut=${checkOut}`,
        type: 'GET',
        success: function (rooms) {
            displayRooms(rooms);
            if (rooms.length === 0) {
                showAlert('No rooms available for these dates', 'info');
            }
        }
    });
}

// Booking Functions
function handleBookRoomClick() {
    if (!currentUser) {
        showAlert('Please login to book a room', 'warning');
        showPage('loginPage');
        return;
    }

    const checkIn = $('#checkInDate').val();
    const checkOut = $('#checkOutDate').val();
    const guests = parseInt($('#guests').val());

    if (!selectedRoom) {
        showAlert('Please select a room', 'warning');
        return;
    }

    if (!checkIn || !checkOut) {
        showAlert('Please select check-in and check-out dates', 'warning');
        return;
    }

    if (guests > selectedRoom.capacity) {
        showAlert(`Room capacity is ${selectedRoom.capacity} guests`, 'warning');
        return;
    }

    bookingData = {
        roomId: selectedRoom.id,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: guests,
        room: selectedRoom
    };

    // Hide modal and show booking page
    const modal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
    modal.hide();

    showBookingPage();
}

function showBookingPage() {
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * bookingData.room.price;

    const roomInfo = `
        <h6>Room ${bookingData.room.number}</h6>
        <p><strong>Type:</strong> ${bookingData.room.type}</p>
        <p><strong>Check-in:</strong> ${formatDate(bookingData.checkIn)}</p>
        <p><strong>Check-out:</strong> ${formatDate(bookingData.checkOut)}</p>
        <p><strong>Nights:</strong> ${nights}</p>
        <h5 class="mt-3">Total: <span style="color: #0f766e;">$${totalPrice.toFixed(2)}</span></h5>
    `;

    $('#bookingRoomInfo').html(roomInfo);
    $('#bookingGuests').val(bookingData.guests);
    $('#bookingGuests').attr('max', bookingData.room.capacity);
    $('#specialRequests').val('');
    $('#bookingError').hide();

    showPage('bookingPage');
}

function handleBooking(e) {
    e.preventDefault();

    const guests = parseInt($('#bookingGuests').val());
    const specialRequests = $('#specialRequests').val();

    if (guests > bookingData.room.capacity) {
        $('#bookingError').text(`Room capacity is ${bookingData.room.capacity} guests`).show();
        return;
    }

    const bookingPayload = {
        roomId: bookingData.roomId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: guests,
        specialRequests: specialRequests
    };

    $.ajax({
        url: `${API_BASE}/bookings`,
        type: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        data: JSON.stringify(bookingPayload),
        success: function (response) {
            showBookingConfirmation(response.booking);
            $('#bookingForm')[0].reset();
        },
        error: function (xhr) {
            const error = xhr.responseJSON?.error || 'Booking failed';
            $('#bookingError').text(error).show();
        }
    });
}

function showBookingConfirmation(booking) {
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * bookingData.room.price;

    const confirmationHtml = `
        <div class="alert alert-success">
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Room ID:</strong> ${booking.roomId}</p>
            <p><strong>Check-in:</strong> ${formatDate(booking.checkIn)}</p>
            <p><strong>Check-out:</strong> ${formatDate(booking.checkIn)}</p>
            <p><strong>Status:</strong> ${booking.status.toUpperCase()}</p>
            <p><strong>Nights:</strong> ${nights}</p>
            <h5 class="mt-3">Total: <span style="color: #0f766e;">$${totalPrice.toFixed(2)}</span></h5>
        </div>
        <p>A confirmation email has been sent to your account.</p>
    `;

    $('#confirmationDetails').html(confirmationHtml);

    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();

    $('#confirmationCloseBtn').on('click', function () {
        modal.hide();
        showPage('bookingsPage');
        loadUserBookings();
    });
}

// My Bookings Functions
function loadUserBookings() {
    if (!currentUser) {
        showPage('loginPage');
        return;
    }

    $.ajax({
        url: `${API_BASE}/bookings`,
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        success: function (bookings) {
            displayUserBookings(bookings);
        },
        error: function () {
            $('#bookingsList').html('<div class="empty-state"><h3>Error loading bookings</h3></div>');
        }
    });
}

function displayUserBookings(bookings) {
    const bookingsList = $('#bookingsList');

    if (bookings.length === 0) {
        bookingsList.html('<div class="empty-state"><h3>No bookings yet</h3><p>Book a room to see your reservations here</p></div>');
        return;
    }

    bookingsList.empty();

    bookings.forEach(booking => {
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalPrice = booking.room ? nights * booking.room.price : 0;

        const statusClass = booking.status === 'cancelled' ? 'cancelled' : '';
        const bookingHtml = `
            <div class="booking-item ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>Room ${booking.room ? booking.room.number : 'N/A'} - ${booking.room ? booking.room.type : 'N/A'}</h5>
                        <span class="booking-status ${booking.status}">${booking.status.toUpperCase()}</span>
                    </div>
                    <div class="text-end">
                        <h5>$${totalPrice.toFixed(2)}</h5>
                        <small>${nights} night(s)</small>
                    </div>
                </div>
                <div class="booking-details">
                    <div class="detail-item">
                        <strong>Check-in</strong>
                        <span>${formatDate(booking.checkIn)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Check-out</strong>
                        <span>${formatDate(booking.checkOut)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Guests</strong>
                        <span>${booking.guests}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Booking ID</strong>
                        <span>${booking.id.substring(0, 8)}...</span>
                    </div>
                </div>
                ${booking.specialRequests ? `<p class="mt-2"><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
                ${booking.status === 'confirmed' ? `<button class="btn btn-sm btn-danger mt-2" onclick="cancelBooking(${booking.ID})">Cancel Booking</button>` : ''}
            </div>
        `;
        bookingsList.append(bookingHtml);
    });
}

function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    } else if (!bookingId) {
        handleError('Invalid booking ID');
        return;
    }
    $.ajax({
        url: `${API_BASE}/bookings/${bookingId}/cancel`,
        type: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        success: function () {
            showAlert('Booking cancelled successfully', 'success');
            loadUserBookings();
        },
        error: function (xhr) {
            const error = xhr.responseJSON?.error || 'Error cancelling booking';
            showAlert(error, 'danger');
        }
    });
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 80px; right: 20px; z-index: 9999; max-width: 400px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    $('body').append(alertHtml);

    setTimeout(() => {
        $('.alert').fadeOut(300, function () { $(this).remove(); });
    }, 4000);
}

// Attach book room button handler
$(document).on('click', '#bookRoomBtn', handleBookRoomClick);


function handleError(error){
    console.error('Error:', error);
}
