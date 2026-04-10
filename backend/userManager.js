const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'users.json');

const defaultUsers = {
  admin: 'admin@3413'
};

function readUsers() {
  if (!fs.existsSync(usersFile)) {
    writeUsers(defaultUsers);
    return defaultUsers;
  }
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read users, using defaults:', err);
    return defaultUsers;
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Failed to write users:', err);
  }
}

function authenticate(username, password) {
  const users = readUsers();
  return users[username] === password;
}

function changePassword(username, oldPassword, newPassword) {
  const users = readUsers();
  if (users[username] === oldPassword) {
    users[username] = newPassword;
    writeUsers(users);
    return true;
  }
  return false;
}

module.exports = {
  authenticate,
  changePassword
};
