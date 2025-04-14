const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST allowed' });
  }

  const { chat_id } = req.body;

  if (!chat_id) {
    return res.status(400).json({ message: 'chat_id is required' });
  }

  const filePath = path.resolve('./users.json');
  let users = [];

  if (fs.existsSync(filePath)) {
    users = JSON.parse(fs.readFileSync(filePath));
  }

  if (!users.includes(chat_id)) {
    users.push(chat_id);
    fs.writeFileSync(filePath, JSON.stringify(users));
  }

  res.status(200).json({ message: 'User registered', users });
};
