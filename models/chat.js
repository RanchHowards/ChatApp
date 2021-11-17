const mongoose = require('mongoose')

const schema = new mongoose.Schema(
  {
    messages: [{ message: String, author: String }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Chat', schema)
