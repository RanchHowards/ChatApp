const mongoose = require('mongoose')

const schema = new mongoose.Schema(
  {
    name: String,
    messages: [{ message: String, author: String, chatID: String }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Chat', schema)
