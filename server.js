const express = require("express");
const connectDB = require("./database");
const User = require("./Models/User");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const verifyToken = require("./middleware/verifyToken");
const Course = require("./Models/Course");
require("dotenv").config();
const bcrypt = require("bcrypt");
const upload = require("./Config/multer");
const { authorizeRole, authMiddleware } = require("./middleware/authorization");
const app = express();
connectDB();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
// bcrypt library -> npm install bcrypt

// for hashing any password we will use bcrypt.hash method.
// for mathcin a normal password with hashed password we will use bcrypt.compare method.
// bcrypt.hash method
// we will need only two parameters if we have to hash any password.
// 1. Password 2. saltRounds- A cerified number at which a particular algorithm wil be hitted. -> genSalt(20)
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, contact, role } = req.body;
    const otp = Math.floor(1000000 + Math.random() * 900000).toString();
    // for saving this data
    const saltRounds = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      contact,
      // otp,
      role,
    });
    await newUser.save();
    // const result = await bcrypt.compare(password,hashedPassword);
    // console.log(hashedPassword);
    // console.log('value of matched password is ', result);
    //   const subject = "Welcome to our Platform 👍🙌 Your otp for verification";
    //   const text = Hii 👋 ${name}, \n Thank YOu for registering at our platform. Your otp is ${otp}, please don't share it to anybody else;
    //   const html= `
    //   <h2>Welcome ${name}<h2/>
    //   <p styles={{color:'blue'}}>Your opt is : ${otp}<p/>
    //   <p styles={{color:'red'}}>please your these otp for verification your account<p/>
    //   `;
    //   sendMail(email,subject,text,html);
    console.log("data inserted successfully");
    return res.status(200).json({ message: "success" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post(
  "/add-course",
  authMiddleware,
  authorizeRole("Counsellor"),
  upload.single("banner"),
  async (req, res) => {
    try {
      const {
        title,
        duration,
        description,
        category,
        discountPercentage,
        OfferTillDate,
        startDate,
        endDate,
        createdBy,
      } = req.body;

      const banner = req.file.path;
      const newCourse = new Course({
        title,
        duration,
        description,
        category,
        discountPercentage,
        OfferTillDate,
        startDate,
        endDate,
        createdBy,
        banner,
      });

      await newCourse.save();
      return res.status(200).json({ message: "success in register course" });
    } catch (error) {
      console.error("Course upload error =>", error);

      return res.status(500).json({
        message: "Failed to add course",
        error: error?.message || "Unknown error",
      });
    }
  }
);
app.get("/all-course", async (req, res) => {
  try {
    const { search, duration, category } = req.query;
    let filters = {};
    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }
    if (duration) {
      filters.duration = duration;
    }
    if (category) {
      filters.category = { $regex: category, $options: "i" };
    }
    const course = await Course.find(filters);
    res.json(course);
  } catch (error) {
    res.status(502).json({ message: "error in getting course", error });
  }
});

app.get(
  "/allusers",
  authMiddleware,
  authorizeRole("Counsellor"),
  async (req, res) => {
    try {
      //jab database se sare users ko find krna ho to kon sa method use krenge
      // find()=> to find all users
      const users = await User.find();
      res.json(users);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

app.patch("/edit", async (req, res) => {
  try {
    const { title } = req.body;
    const user = await Course.findOne({ title });
    if (!user) {
      return res.status(403).json({ message: "id not find" });
    }
    const updatetitle = await Course.updateOne(
      { title },
      { $set: { title: "web development" } }
    );
    // await updatetitle.save();
    return res.status(200).json({ message: "successfully update " });
  } catch (error) {
    return res.status(500).json({ message: "error in editing" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: "user not existing..." });
    }
    // const res = await bcrypt.compare(password,user.password) // it returns bollean value...
    // if(!res){
    //     return res.status(404).json({message:'password is not matched...'});
    // }

    //     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InJha2EzNEBnbWFpbC5jb20iLCJpYXQiOjE3NDQyNzgyMDcsImV4cCI6MTc0NDI4MTgwN30.BB5vxjFJDwaG_jYyWrpCMuLYfCR9NEMU6vfS0b-J1yc"

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({ message: "success login", token });
  } catch (error) {
    return res.status(500).json({ message: "error in login" });
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user not found..." });
    }
    if (otp === user.otp) {
      console.log("otp verified...");
      user.otp = null;
      await user.save();
      return res.status(202).json({ message: "otp verification success..." });
    } else {
      return res.status(405).json({ message: "otp not matched..." });
    }
  } catch (error) {
    return res.status(503).json({ message: "error in verify otp..." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(
    `server is running on localhost:${process.env.PORT} thank you so much `
  );
});
