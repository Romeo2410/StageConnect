const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql2");
const fileUpload = require("express-fileupload");
const basicAuth = require("express-basic-auth");
require("dotenv").config();
app.use(["/admin", "/api/admin"],
  basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true
  })
);
const PORT = process.env.PORT;
// ---------------------- Start Server ----------------------
app.listen(PORT, function () {
  console.log("Server Started");
});
// ---------------------- Middleware ----------------------
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
//-------------Cloudinary-------------------------------
var cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});
// ---------------------- Database ----------------------
const config = process.env.DB_URL;
const mysqlServer = mysql.createConnection(config);
mysqlServer.connect(function (err) {
  if (err == null) {
    console.log("Connected to Database Successfully");
  } else {
    console.log(err.message);
  }
});
// ----------------------Page Routes ----------------------
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dash-Musician", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "dash-Musician.html"));
});

app.get("/dash-Venue", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "dash-Venue.html"));
});

app.get("/profile-Venue", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "profile-Venue.html"));
});

app.get("/profile-Musician", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "profile-Musician.html"));
});

app.get("/admin", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
function updateEventStatus(callback) {
  mysqlServer.query("update events set event_status='Completed' where TIMESTAMP(event_date, event_time) < NOW()",
    function (err) {
      if (err) {
        console.log("Status update error:", err);
      }
      if (callback) callback();
    }
  );
}
// ------------------------Create Event venue------------
app.post("/create-event", async function (req, resp) {
  try {
    let posted_by = req.body.posted_by;
    let title = req.body.event_title;
    let type = req.body.event_type;
    let date = req.body.event_date;
    let time = req.body.event_time;
    let genre = req.body.required_genre;
    let performers = req.body.performers_needed;
    let budget = req.body.budget;
    let status = req.body.event_status;
    let venue = req.body.venue_name;
    let city = req.body.city;
    let address = req.body.full_address;
    let info = req.body.additional_info;
    console.log("Create Event By:", posted_by);
    let filename = "";
    //-------------Poster handling---------------
    if (!req.files || !req.files.poster) {
      filename = "noposter.jpg";
    } else {
      filename = Date.now() + "_" + req.files.poster.name;
      let path = __dirname + "/public/uploads/" + filename;
      await req.files.poster.mv(path);
      let result = await cloudinary.uploader.upload(path);
      filename = result.secure_url;
    }
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    //--------------Insert into DB venue--------
    mysqlServer.query("insert into events (posted_by,event_title,event_type,event_date,event_time,required_genre,performers_needed,budget,event_status,venue_name,city,full_address,additional_info,poster) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [posted_by, title, type, date, time, genre, performers, budget, status, venue,
        city, address, info, filename], function (err) {
          if (err == null) {
            resp.send("Event Created Successfully");
          } else {
            console.log(err);
            resp.send(err.message);
          }
        }
    );
  } catch (err) {
    console.log(err);
    resp.send(err.message);
  }
});
//---------------Update Event venue------------
app.post("/update-event", async function (req, resp) {
  try {
    let id = req.body.event_id;
    let title = req.body.event_title;
    let type = req.body.event_type;
    let date = req.body.event_date;
    let time = req.body.event_time;
    let genre = req.body.required_genre;
    let performers = req.body.performers_needed;
    let budget = req.body.budget;
    let status = req.body.event_status;
    let venue = req.body.venue_name;
    let city = req.body.city;
    let address = req.body.full_address;
    let info = req.body.additional_info;
    let filename = "";
    //  Poster handling venue update
    if (!req.files || !req.files.poster) {
      filename = req.body.oldposter;
    } else {
      filename = Date.now() + "_" + req.files.poster.name;
      let path = __dirname + "/public/uploads/" + filename;
      await req.files.poster.mv(path);
      let result = await cloudinary.uploader.upload(path);
      filename = result.secure_url;
    }
    mysqlServer.query("update events set event_title=?,event_type=?,event_date=?,event_time=?,required_genre=?,performers_needed=?,budget=?,event_status=?,venue_name=?,city=?,full_address=?,additional_info=?,poster=? where event_id=?",
      [title, type, date, time, genre, performers, budget, status, venue, city, address,
        info, filename, id], function (err) {
          if (err == null) {
            resp.send("Event Updated Successfully");
          } else {
            console.log(err);
            resp.send(err.message);
          }
        }
    );
  } catch (err) {
    console.log(err);
    resp.send(err.message);
  }
});
//------Fetch Created Events by id for Venue 
app.get("/fetch-event", function (req, resp) {
  let id = req.query.event_id;
  let postedBy = req.query.posted_by;
  mysqlServer.query("select * from events where event_id = ? and posted_by = ?", [id,postedBy], function (err, result) {
    if (err != null) resp.send(err.message);
    else resp.send(result);
  }
  );
});
//----- venue se jo events post kiye hai wo fetch
app.get("/fetch-my-events", function (req, resp) {
  updateEventStatus(function () {
    let emailid = req.query.posted_by;
    mysqlServer.query("select * from events where posted_by=?", [emailid],
      function (err, result) {
        if (err) return resp.send(err.message);
        resp.send(result);
      }
    );
  });
});
// ---------------------- Signup ----------------------
// query params: txtName, txtEmail, txtPwd, utype (Musician/Venue)
app.get("/signup", function (req, res) {
  const name = req.query.txtName;
  const email = req.query.txtEmail;
  const pwd = req.query.txtPwd;
  const utype = req.query.utype;
  if (!name || !email || !pwd || !utype) {
    return res.send("Please fill all fields");
  }
  if (pwd.length < 8) {
    return res.send("Password must be at least 8 characters");
  }
  mysqlServer.query("insert into users(name, email, password, Usertype, dos, status) values(?,?,?,?,CURRENT_DATE(),?)",
    [name, email, pwd, utype, 1],
    function (err) {
      if (err == null) {
        res.send("Signed Up Successfully");
      } else if (err.code === "ER_DUP_ENTRY") {
        res.send("Already Taken");
      } else {
        console.error("Signup DB error:", err.message);
        res.send("Database Error");
      }
    }
  );
});
// ---------------------- Login ----------------------
// GET /Login
// query params: txtLogemail, txtLogpwd
app.get("/login", function (req, res) {
  const email = req.query.txtLogemail;
  const pwd = req.query.txtLogpwd;
  if (!email || !pwd) {
    return res.send("Incorrect credentials");
  }
  mysqlServer.query("select * from users where email=? and password=? and status=1",
    [email, pwd],
    function (err, rows) {
      if (err) {
        console.error("Login DB error:", err.message);
        return res.send("Database Error");
      }
      if (!rows || rows.length !== 1) {
        return res.send("Incorrect credentials");
      }
      const userType = String(rows[0].Usertype || "").trim();
      if (userType.toLowerCase() === "musician") {
        return res.send({
          role: "Musician",
          name: rows[0].name,
          email: rows[0].email
        });
      }

      if (userType.toLowerCase() === "venue") {
        return res.send({
          role: "Venue",
          name: rows[0].name,
          email: rows[0].email
        });
      }
      return res.send("Incorrect credentials");
    }
  );
});
//-------Feedbacks database mein save
app.post("/SendFeedback", function (req, resp) {
  try {
    const Fname = req.body.feedname;
    const feed = req.body.Feedback;
    const num = req.body.Cont;
    const role = req.body.feedbackRole || "Visitor";
    console.log("Feedback received:", Fname, role, num, feed);
    //---insert into database
    mysqlServer.query("insert into feedback (name, role, contact, message) values (?, ?, ?, ?)",
      [Fname, role, num, feed],
      function (err) {
        if (err) {
          console.error("DB Error:", err);
          resp.send("Error storing feedback.");
        } else {
          resp.send("Feedback submitted successfully!");
        }
      }
    );
  } catch (err) {
    console.error(err);
    resp.send("Server error occurred.");
  }
});
//----------Feedback ko display krao on index page---------
app.get("/get-feedbacks", function (req, resp) {
  mysqlServer.query("select id, name, role, message from feedback where status=1 order by submitted_on desc",
    function (err, results) {
      if (err) {
        console.error("Fetch Error:", err);
        resp.send([]);
      } else {
        resp.send(results);
      }
    });
});
//-------fetch musican profile----
app.get("/fetch-musician-profile", function (req, resp) {
  let email = req.query.email;
  mysqlServer.query("select * from musician_profile where email=?",
    [email],
    function (err, result) {
      if (err == null) {
        resp.send(result);
      } else {
        resp.send(err.message);
      }
    }
  );
});
//-----save musician profile----
app.post("/save-musician-profile", async function (req, resp) {
  try {
    let email = req.body.email;
    let stage_name = req.body.stage_name;
    let genre = req.body.genre;
    let experience = req.body.experience;
    let bio = req.body.bio;
    let phone = req.body.phone;
    let city = req.body.city;
    let state = req.body.state;
    let fee = req.body.fee;
    let youtube = req.body.youtube_link;
    let available = req.body.available_for;
    // checkbox fix
    if (Array.isArray(available)) {
      available = available.join(",");
    }
    // multi select genre fix
    if (Array.isArray(genre)) {
      genre = genre.join(",");
    }
    let filename = "";
    if (!req.files || !req.files.profile_image) {
      filename = "noimage.jpg";
    } else {
      filename = Date.now() + "_" + req.files.profile_image.name;
      let filepath = __dirname + "/public/uploads/" + filename;
      // move file
      await req.files.profile_image.mv(filepath);
      // upload to cloudinary
      let result = await cloudinary.uploader.upload(filepath);
      filename = result.secure_url;
    }
    // -------- INSERT INTO DB musician ki profile ----------
    mysqlServer.query("insert into musician_profile (email, stage_name, genre, experience, bio, phone, city, state, fee, available_for, youtube_link, profile_image) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [email, stage_name, genre, experience, bio, phone, city, state, fee, available, youtube, filename],
      function (err) {
        if (err == null) {
          resp.send("Profile Saved Successfully");
        } else {
          console.log(err);
          resp.send(err.message);
        }
      }
    );
  } catch (err) {
    console.log(err);
    resp.send(err.message);
  }
});
// -------- UPDATE MUSICIAN PROFILE --------
app.post("/update-musician-profile", async function (req, resp) {
  try {
    let email = req.body.email;
    let stage_name = req.body.stage_name;
    let genre = req.body.genre;
    let experience = req.body.experience;
    let bio = req.body.bio;
    let phone = req.body.phone;
    let city = req.body.city;
    let state = req.body.state;
    let fee = req.body.fee;
    let youtube = req.body.youtube_link;
    let available = req.body.available_for;
    // checkbox fix
    if (Array.isArray(available)) {
      available = available.join(",");
    }
    // multi select fix
    if (Array.isArray(genre)) {
      genre = genre.join(",");
    }
    let filename = "";
    // -------- IMAGE UPDATE LOGIC --------
    if (!req.files || !req.files.profile_image) {
      // keep old image
      filename = req.body.oldimage;
    } else {
      filename = Date.now() + "_" + req.files.profile_image.name;
      let filepath = __dirname + "/public/uploads/" + filename;
      await req.files.profile_image.mv(filepath);
      let result = await cloudinary.uploader.upload(filepath);
      filename = result.secure_url;
    }
    // -------- UPDATE ka code database k liye--------
    mysqlServer.query("update musician_profile set stage_name=?, genre=?, experience=?, bio=?, phone=?, city=?, state=?, fee=?, available_for=?, youtube_link=?, profile_image=? where email=?",
      [stage_name, genre, experience, bio, phone, city, state, fee, available, youtube,
        filename, email],
      function (err) {
        if (err == null) {
          resp.send("Profile Updated Successfully");
        } else {
          console.log(err);
          resp.send(err.message);
        }
      }
    );
  } catch (err) {
    console.log(err);
    resp.send(err.message);
  }
});
// ================== FIND EVENTS==================
//----- Fetch Event Cities
app.get("/fetch-event-cities", function (req, resp) {
  mysqlServer.query("select distinct city from events where event_status='Active'",
    function (err, result) {
      if (err) return resp.send(err.message);
      resp.send(result);
    }
  );
});
//-----Fetch Event Genres
app.get("/fetch-event-genres", function (req, resp) {
  mysqlServer.query("select distinct required_genre as genre from events where event_status='Active'",
    function (err, result) {
      if (err) return resp.send(err.message);
      resp.send(result);
    }
  );
});
//------Fetch All Events
app.get("/fetch-all-events", function (req, resp) {
  updateEventStatus(function () {
    mysqlServer.query("select * from events where event_status='Active'",
      function (err, result) {
        if (err) return resp.send(err.message);
        resp.send(result);
      }
    );
  });

});
//---- Fetch Events by City + Genre (FILTER)
app.get("/fetch-events", function (req, resp) {
  updateEventStatus(function () {
    let city = req.query.city;
    let genre = req.query.genre;
    let query = "select * from events where event_status='Active'";
    let values = [];
    if (city && city !== "none") {
      query += " AND city=?";
      values.push(city);
    }
    if (genre && genre !== "none") {
      query += " AND required_genre=?";
      values.push(genre);
    }
    mysqlServer.query(query, values, function (err, result) {
      if (err) return resp.send(err.message);
      resp.send(result);
    });
  });
});
app.post("/apply-event", function (req, resp) {
  updateEventStatus(function () {
    const { event_id, musician_email } = req.body;
    // 1. CHECK PROFILE FIRST
    mysqlServer.query("select * from musician_profile where email=?",
      [musician_email],
      function (err, profileResult) {
        if (err) return resp.send("Server Error");
        if (profileResult.length === 0) {
          return resp.send("PROFILE_INCOMPLETE");
        }
    // 2. Check event
    mysqlServer.query("select event_status, posted_by from events where event_id=?",
      [event_id],
          function (err, eventResult) {
            if (err) return resp.send("Server Error");
            if (eventResult.length === 0) {
              return resp.send("Event not found");
            }
            if (eventResult[0].event_status !== "Active") {
              return resp.send("Event is no longer available");
            }
            const venue_email = eventResult[0].posted_by;
    // 3. Check duplicate application
    mysqlServer.query("select * from applications where event_id=? and musician_email=?",
      [event_id, musician_email],
              function (err, existingResult) {
                if (err) return resp.send("Server Error");
                if (existingResult.length > 0) {
                  return resp.send("You have already applied for this event");
                }
    // 4. Insert application
    mysqlServer.query("insert into applications (event_id, musician_email, venue_email) values (?, ?, ?)",
      [event_id, musician_email, venue_email],
                  function (err) {
                    if (err) return resp.send("Server Error");
                    return resp.send("Applied Successfully!");
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});
//------applied applications show to venue for acc or rej
app.get("/fetch-venue-applications", function (req, resp) {
  const email = req.query.venue_email;
  mysqlServer.query("select * from applications where venue_email=?",
    [email],
    function (err, result) {
      if (err) {
        console.log(err);
        resp.send("Error fetching data");
      } else {
        resp.send(result);
      }
    }
  );
});
//------ agar event ko bnd krna to closed 
app.post("/close-event", function (req, resp) {
  let id = req.body.id;
  mysqlServer.query("update events set event_status='Closed' where event_id=?", [id], function (err, result) {
    if (err != null) {
      resp.send(err.message);
    }
    else {
      resp.send("Event Closed Successfully!");
    }
  });
});
//-----agar activate krna to
app.post("/active-event", function (req, resp) {
  let id = req.body.id;
  mysqlServer.query("update events set event_status='Active' where event_id=?", [id], function (err, result) {
    if (err != null) {
      resp.send(err.message);
    }
    else {
      resp.send("Event Activated Successfully!");
    }
  });
});
//----- event ko manually delete krna ho (Wrong Event)
app.post("/delete-event", function (req, resp) {
  let id = req.body.id;
  mysqlServer.query("delete from events where event_id=?", [id], function (err, result) {
    if (err != null) {
      resp.send(err.message);
    }
    else {
      resp.send("Event Deleted Successfully!");
    }
  });
});
//----- venue k acc ya rej k liye 
app.post("/update-application-status", (req, res) => {
  const { id, status } = req.body;
  mysqlServer.query("update applications set status=? where app_id=?",
    [status, id], function (err) {
      if (err) {
        console.log(err);
        return res.send("Error updating status");
      }
      res.send("Updated successfully");
    }
  );
});
//----- accept ya reject to pehla musician di profile check aste 
app.get("/get-musician-info", function (req, res) {
  const email = req.query.email;
  console.log(email);
  mysqlServer.query("select * from musician_profile where email=?", [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Error");
    }
    res.send(result[0]);
  });
});
//----musician applications jo applied ----
app.get("/fetch-my-applications", function (req, resp) {
  let email = req.query.email;
  console.log(email);
  mysqlServer.query("select * from applications where musician_email=?",
    [email],
    function (err, result) {
      if (err) {
        console.log(err);
        resp.send("Error fetching data");
      } else {
        resp.send(result);
      }
    }
  );
});
//-----musician check event details ki kis k liye apply kra tha
app.get("/get-event-details", function (req, resp) {
  let id = req.query.event_id;
  mysqlServer.query("select * from events where event_id=?", [id], function (err, result) {
    if (err) {
      console.log(err);
      resp.send("Error fetching event");
    } else {
      resp.send(result[0]);
    }
  }
  );
});
//--- agar application vapis----
app.post("/withdraw-application", function (req, resp) {
  let id = req.body.id;
  let email = req.body.email;
  mysqlServer.query("delete from applications where event_id=? and musician_email=?", [id, email],
    function (err, result) {
      if (err) {
        console.log(err);
        resp.send("Error deleting application");
      } else {
        resp.send("Application Withdrawn");
      }
    }
  );
});
// -------- DELETE MUSICIAN PROFILE --------
app.post("/delete-musician-profile", function (req, resp) {
  let email = req.body.email;
  mysqlServer.query("delete from musician_profile where email=?", [email], function (err) {
    if (err) {
      console.log(err);
      resp.send("Error deleting profile");
    } else {
      resp.send("Profile Deleted Successfully");
    }
  }
  );
});
app.get("/venue-dashboard-stats", function (req, res) {
  const email = req.query.email;
  updateEventStatus(function () {
    mysqlServer.query("select event_status from events where posted_by=?", [email],
      function (err, events) {
        if (err) return res.send("Error fetching stats");
        let totalEvents = events.length;
        let activeEvents = 0;
        for (let i = 0; i < events.length; i++) {
          if (events[i].event_status === "Active") {
            activeEvents++;
          }
        }
        mysqlServer.query("select * from applications where venue_email=?",
          [email],
          function (err, apps) {
            if (err) return res.send("Error fetching stats");
            res.send({
              totalEvents,
              activeEvents,
              totalApplications: apps.length
            });
          }
        );
      }
    );
  });
});
app.get("/musician-dashboard-stats", function (req, res) {
  const email = req.query.email;
  mysqlServer.query("select * from applications where musician_email=?", [email],
    function (err, apps) {
      if (err) {
        console.log(err);
        return res.send("Error fetching stats");
      }
      let totalApplications = apps.length;
      let acceptedGigs = 0;
      for (let i = 0; i < apps.length; i++) {
        if (apps[i].status === "Accepted") {
          acceptedGigs++;
        }
      }
      res.send({
        totalApplications,
        acceptedGigs
      });
    }
  );
});
//---Admin
app.get("/update-user-status", function (req, res) {
  let email = req.query.email;
  let status = req.query.status;

  mysqlServer.query("update users set status=? where email=?",
    [status, email],
    function (err) {
      if (err) return res.send("Error updating status");
      res.send("Status Updated");
    }
  );
});
app.get("/all-records", function (req, res) {
  mysqlServer.query("select email, Usertype, status from users",
    function (err, result) {
      if (err) {
        console.log(err);
        return res.send("DB Error");
      }
      res.send(result);
    }
  );
});
app.get("/hide-feedback", function (req, res) {
  let id = req.query.id;

  mysqlServer.query("update feedback set status=0 where id=?", [id], function (err) {
    if (err) {
      console.log(err);
      res.send("Error hiding testimonial");
    } else {
      res.send("Testimonial hidden");
    }
  });
});
app.get("/show-feedback", function (req, res) {
  let id = req.query.id;

  mysqlServer.query("update feedback set status=1 where id=?", [id], function (err) {
    if (err) {
      console.log(err);
      res.send("Error showing testimonial");
    } else {
      res.send("Testimonial visible now");
    }
  });
});
app.get("/get-all-feedbacks", function (req, resp) {
  mysqlServer.query("select * from feedback order by submitted_on desc",
    function (err, result) {
      if (err) {
        console.log(err);
        resp.send([]);
      } else {
        resp.send(result);
      }
    });
});