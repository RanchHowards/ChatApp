const { createServer } = require('http')
const express = require('express')
const { execute, subscribe } = require('graphql')
const { ApolloServer, gql } = require('apollo-server-express')
const { PubSub } = require('graphql-subscriptions')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const mongoose = require('mongoose')
require('dotenv').config()

const pubsub = new PubSub()
const app = express()
const httpServer = createServer(app)

// const bcrypt = require('bcrypt')
// const saltRounds = 10
// const jwt = require('jsonwebtoken')
const Chat = require('./models/chat.js')
// const Event = require('./models/event')
// const Comment = require('./models/comment')

//MONGOOSE
// const JWT_SECRET = process.env.SECRET
;(async () => {
  const MONGODB_URI = process.env.MONGODB

  const PORT = process.env.PORT || 4000

  // console.log('connecting to', MONGODB_URI)

  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useFindAndModify: false,
      // useCreateIndex: true,
    })
    .then(() => {
      console.log('connected to MongoDB')
    })
    .catch((error) => {
      console.log('error connection to MongoDB:', error.message)
    })

  // Schema definition
  const typeDefs = gql`
    type Message {
      message: String
      author: String
    }
    type Chat {
      messages: [Message]
      id: ID
    }
    type Query {
      chats: [Chat]
    }
    type Mutation {
      addMessage(message: String, author: String, chatID: ID): Message
      createChat: Chat
    }
  `
  //  type Subscription {
  //   numberIncremented: Int
  // }

  // Resolver map
  const resolvers = {
    Query: {
      chats: async () => {
        return Chat.find({})
      },
    },
    Mutation: {
      createChat: async () => {
        try {
          const newChat = new Chat({})
          await newChat.save()
          return newChat
        } catch (err) {
          console.log('CREATE CHAT', err)
        }
      },
      addMessage: async (root, { message, author, chatID }) => {
        try {
          const chat = await Chat.findById(chatID)
          chat.messages.push({ message, author })
          await chat.save()
          return chat
        } catch (err) {
          console.log('CREATE CHAT', err)
        }
      },
    },
    // Subscription: {
    //   numberIncremented: {
    //     subscribe: () => pubsub.asyncIterator(['NUMBER_INCREMENTED']),
    //   },
    // },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const server = new ApolloServer({
    schema,
  })
  await server.start()
  server.applyMiddleware({ app })

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  )

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    )
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    )
  })

  // function incrementNumber() {
  //   currentNumber++
  //   pubsub.publish('NUMBER_INCREMENTED', { numberIncremented: currentNumber })
  //   setTimeout(incrementNumber, 1000)
  // }
})()
