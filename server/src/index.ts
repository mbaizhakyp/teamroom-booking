import express from "express";
import type { Application, Request, Response } from "express";
import roomsRouter from "./routes/room.js";
import usersRouter from "./routes/user.js"
import bookingsRouter from "./routes/booking.js"
import authRouter from "./routes/auth.js"

const app: Application = express();
const port = 3000; // The port your express server will be running on.

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/rooms", roomsRouter)
app.use("/users", usersRouter)
app.use("/bookings", bookingsRouter)
app.use("/login", authRouter)

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
