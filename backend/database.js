const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// In-memory database
const database = {
  users: [
    {
      id: 'user-1',
      username: 'demo',
      password: bcrypt.hashSync('demo123', 10),
      email: 'demo@qahotel.com',
      fullName: 'Demo User',
      phone: '555-0001'
    }
  ],
  rooms: [
    { id: 'room-1', number: '101', type: 'Single', price: 79, capacity: 1, amenities: ['TV', 'WiFi', 'AC'] },
    { id: 'room-2', number: '102', type: 'Double', price: 99, capacity: 2, amenities: ['TV', 'WiFi', 'AC', 'Mini Fridge'] },
    { id: 'room-3', number: '103', type: 'Double', price: 99, capacity: 2, amenities: ['TV', 'WiFi', 'AC', 'Mini Fridge'] },
    { id: 'room-4', number: '201', type: 'Suite', price: 149, capacity: 3, amenities: ['TV', 'WiFi', 'AC', 'Jacuzzi', 'Balcony'] },
    { id: 'room-5', number: '202', type: 'Suite', price: 149, capacity: 3, amenities: ['TV', 'WiFi', 'AC', 'Jacuzzi', 'Balcony'] },
    { id: 'room-6', number: '203', type: 'Deluxe', price: 199, capacity: 4, amenities: ['TV', 'WiFi', 'AC', 'Jacuzzi', 'Balcony', 'Kitchenette'] }
  ],
  bookings: []
};

// User functions
const createUser = (username, password, email, fullName, phone) => {
  const existingUser = database.users.find(u => u.username === username);
  if (existingUser) {
    return null;
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    email,
    fullName,
    phone
  };
  
  database.users.push(user);
  return user;
};

const findUserByUsername = (username) => {
  return database.users.find(u => u.username === username);
};

const findUserById = (id) => {
  return database.users.find(u => u.id === id);
};

const validatePassword = (plainPassword, hashedPassword) => {
  return bcrypt.compareSync(plainPassword, hashedPassword);
};

// Room functions
const getAllRooms = () => {
  return database.rooms;
};

const getRoomById = (id) => {
  return database.rooms.find(r => r.id === id);
};

const getAvailableRooms = (checkIn, checkOut) => {
  const bookedRoomIds = database.bookings
    .filter(b => {
      const bookingCheckIn = new Date(b.checkIn);
      const bookingCheckOut = new Date(b.checkOut);
      const reqCheckIn = new Date(checkIn);
      const reqCheckOut = new Date(checkOut);
      
      return (reqCheckIn < bookingCheckOut && reqCheckOut > bookingCheckIn);
    })
    .map(b => b.roomId);
  
  return database.rooms.filter(r => !bookedRoomIds.includes(r.id));
};

// Booking functions
const createBooking = (userId, roomId, checkIn, checkOut, guests, specialRequests) => {
  const booking = {
    id: uuidv4(),
    userId,
    roomId,
    checkIn,
    checkOut,
    guests,
    specialRequests,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  
  database.bookings.push(booking);
  return booking;
};

const getUserBookings = (userId) => {
  return database.bookings.filter(b => b.userId === userId);
};

const cancelBooking = (bookingId) => {
  const index = database.bookings.findIndex(b => b.id === bookingId);
  if (index > -1) {
    database.bookings[index].status = 'cancelled';
    return database.bookings[index];
  }
  return null;
};

const getBookingById = (id) => {
  return database.bookings.find(b => b.id === id);
};

module.exports = {
  createUser,
  findUserByUsername,
  findUserById,
  validatePassword,
  getAllRooms,
  getRoomById,
  getAvailableRooms,
  createBooking,
  getUserBookings,
  cancelBooking,
  getBookingById,
  database
};
