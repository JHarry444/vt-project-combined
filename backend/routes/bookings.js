const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

// Use JWT authentication middleware
const isAuthenticated = verifyToken;

// Get all rooms
router.get('/rooms', (req, res) => {
  const rooms = db.getAllRooms();
  res.json(rooms);
});

// Get available rooms for dates
router.get('/rooms/available', (req, res) => {
  const { checkIn, checkOut } = req.query;
  
  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'Check-in and check-out dates are required' });
  }
  
  const availableRooms = db.getAvailableRooms(checkIn, checkOut);
  res.json(availableRooms);
});

// Get room details
router.get('/rooms/:id', (req, res) => {
  const room = db.getRoomById(req.params.id);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json(room);
});

// Create booking
router.post('/bookings', isAuthenticated, (req, res) => {
  const { roomId, checkIn, checkOut, guests, specialRequests } = req.body;
  
  if (!roomId || !checkIn || !checkOut || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const room = db.getRoomById(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (guests > room.capacity) {
    return res.status(400).json({ error: `Room capacity is ${room.capacity} guests` });
  }
  
  // Check availability
  const availableRooms = db.getAvailableRooms(checkIn, checkOut);
  if (!availableRooms.find(r => r.id === roomId)) {
    return res.status(400).json({ error: 'Room is not available for these dates' });
  }
  
  const booking = db.createBooking(
    req.userId,
    roomId,
    checkIn,
    checkOut,
    guests,
    specialRequests || ''
  );
  
  res.status(201).json({
    message: 'Booking confirmed',
    booking: {
      id: booking.id,
      roomId: booking.roomId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status
    }
  });
});

// Get user bookings
router.get('/bookings', isAuthenticated, (req, res) => {
  const bookings = db.getUserBookings(req.userId);
  
  const enrichedBookings = bookings.map(booking => {
    const room = db.getRoomById(booking.roomId);
    return {
      ...booking,
      room: room
    };
  });
  
  res.json(enrichedBookings);
});

// Get booking details
router.get('/bookings/:id', isAuthenticated, (req, res) => {
  const booking = db.getBookingById(req.params.id);
  
  if (!booking || booking.userId !== req.userId) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  const room = db.getRoomById(booking.roomId);
  
  res.json({
    ...booking,
    room: room
  });
});

// Cancel booking
router.post('/bookings/:id/cancel', isAuthenticated, (req, res) => {
  const booking = db.getBookingById(req.params.id);
  
  if (!booking || booking.userId !== req.userId) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking is already cancelled' });
  }
  
  const cancelledBooking = db.cancelBooking(req.params.id);
  
  res.json({
    message: 'Booking cancelled successfully',
    booking: cancelledBooking
  });
});

module.exports = router;
