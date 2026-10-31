// This module will track who is in which room
const rooms = new Map(); 

export const joinRoom = (roomId, socketId, username) => {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
    }
    rooms.get(roomId).push({ socketId, username });
    return rooms.get(roomId);
};

export const leaveRoom = (socketId) => {
    // Logic to remove user from all rooms they were in on disconnect
    rooms.forEach((users, roomId) => {
        rooms.set(roomId, users.filter(user => user.socketId !== socketId));
    });
};