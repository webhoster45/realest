# Redis Reference Guide for Node.js (ioredis)

Here is how you use these highly efficient Redis commands in Node.js using the standard `ioredis` library.

---

## 📊 HyperLogLog Examples (Unique Counting)

```javascript
import Redis from 'ioredis';
const redis = new Redis();

// 1. PFADD: Add unique elements (O(1))
// Tracks a user visit. Returns 1 if it's a new unique visitor.
await redis.pfadd('visitors:2026-08-09', 'user_123');
await redis.pfadd('visitors:2026-08-09', 'user_456');

// 2. PFCOUNT: Get approximate unique count (O(1))
// Returns the total unique visitors (e.g., 2) using minimal memory.
const uniqueCount = await redis.pfcount('visitors:2026-08-09');

// 3. PFMERGE: Combine multiple days (O(N))
// Merges daily visitor counts into a weekly total key.
await redis.pfmerge('visitors:weekly', 'visitors:2026-08-08', 'visitors:2026-08-09');
```

---

## 📣 Pub/Sub Examples (Real-Time Messaging)

> ⚠️ **Note:** In Node.js, you must use **two separate** Redis client instances because a client becomes dedicated to listening once it subscribes.

```javascript
import Redis from 'ioredis';
const pubClient = new Redis();
const subClient = new Redis();

// 1. SUBSCRIBE: Listen to a channel (O(N))
// Tells the client to start listening for specific messages.
await subClient.subscribe('notifications');

// Catching the messages as they arrive
subClient.on('message', (channel, message) => {
  console.log(`Received from ${channel}: ${message}`);
});

// 2. PUBLISH: Broadcast a message (O(N+M))
// Sends a message out to anyone currently listening.
await pubClient.publish('notifications', 'Hello world!');

// 3. PSUBSCRIBE: Pattern matching listener (O(N))
// Listens to any channel starting with 'orders:', like 'orders:completed'
await subClient.psubscribe('orders:*');
subClient.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern match! ${channel}: ${message}`);
});
```

---

## ⚡ Core Redis Structures (High-Speed O(1))

```javascript
import Redis from 'ioredis';
const redis = new Redis();

// 1. SET & GET: Strings (O(1))
await redis.set('system:status', 'online');
const status = await redis.get('system:status');

// 2. HSET & HGET: Hashes/Objects (O(1))
// Perfect for storing real estate or user objects efficiently.
await redis.hset('property:99', 'price', '450000', 'status', 'available');
const price = await redis.hget('property:99', 'price');

// 3. EXPIRE & TTL: Timers (O(1))
// Deletes the key automatically after 60 seconds.
await redis.expire('session:token:abc', 60);

// 4. LPUSH & LPOP: Lists/Queues (O(1))
// Pushes a task to the front of a line, pops it off the back.
await redis.lpush('task:queue', 'send_email_1');
const nextTask = await redis.lpop('task:queue');

5. SADD & SISMEMBER: Sets/Uniqueness (O(1))

Checks instantly if a user is a premium member.
await redis.sadd('premium:users', 'user_123');
const isPremium = await redis.sismember('premium:users', 'user_123'); // returns 1 (true)
```
