require("dotenv").config();
const express = require("express");
const nunjucks = require("nunjucks");
const webserver = express();
const Vonage = require("@vonage/server-sdk");

// ✅ Do this if using JavaScript
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

webserver.use("/assets", express.static("assets"));

nunjucks.configure("html", { autoescape: false, express: webserver });

webserver.use(express.json());

webserver.use(express.urlencoded({ extended: true }));

// Global database
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("reservations.db");

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

webserver.listen(3000);

SetUpDatabase();
DisplayHomePage();
PostSchedule();

// Displaying Homepage
function DisplayHomePage() {
  // Displaying Homepage after reading an HTML file locally
  webserver.get("/", function (req, res) {
    res.render("index.html");
  });
}

// Student fills in info -> info sent to database -> Student receives text  message with info
function PostSchedule() {
  // POST /new Route Handler
  webserver.post("/schedule", function (req, res) {
    // Student info/variables collected from HTML form

    let professorname = req.body.ProfessorName;
    let appointmentdate = req.body.AppointmentDate;
    let appointmenttime = req.body.AppointmentTime;
    let studentfirstname = req.body.studentfirstname;
    let studentlastname = req.body.studentlastname;
    let studentphonenumber = req.body.studentphonenumber;
    let studentnotes = req.body.studentnotes;

    // Text message info sent to Student
    let message =
      "Dear " +
      studentfirstname +
      " " +
      studentlastname +
      "," +
      " you have successfully booked your appointment! Here are your additional notes: " +
      studentnotes;

    let ValidationCheck = true; // Assume success, prove otherwise
    let ErrorMessage = "";

    if (appointmentdate == "") {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Enter an appointment date</li>";
    } else if (appointmenttime == "" || !appointmenttime) {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Enter an appointment time</li>";
    } else if (professorname == "") {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Select a Professor</li>";
    } else if (studentfirstname == "") {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Enter a Student first name</li>";
    } else if (studentlastname == "") {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Enter a Student last name</li>";
    } else if (studentphonenumber == "") {
      ValidationCheck = false;
      ErrorMessage = ErrorMessage + "<li>Enter a mobile phone number</li>";
    }

    if (ValidationCheck == false) {
      res.render("error.html", {
        ProfessorName: professorname,
        StudentName: studentfirstname + " " + studentlastname,
        AppointmentDate: appointmentdate,
        AppointmentTime: appointmenttime,
        StudentNotes: studentnotes,
        StudentPhoneNumber: studentphonenumber,
        ErrorMessage: ErrorMessage,
      });
    } else {
      vonage.message.sendSms(
        process.env.FROM_PHONE_NUMBER,
        studentphonenumber,
        message,
        (err, responseData) => {
          if (err) {
            console.log(err);
          } else {
            if (responseData.messages[0]["status"] === "0") {
              console.log("Message sent successfully.");
            } else {
              console.log(
                `Message failed with error: ${responseData.messages[0]["error-text"]}`
              );
            }
          }
        }
      );

      // Build SQL string --> insert string to add record to appointments table
      let sqlstring =
        "INSERT INTO Appointments (appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname, studentphonenumber, studentnotes) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)";

      // Execute SQL string into database (Using paramaterized queries to prevent SQL injection)
      db.run(
        sqlstring,
        appointmentdate,
        appointmenttime,
        professorname,
        studentfirstname,
        studentlastname,
        studentphonenumber,
        studentnotes
      );
      // For testing purposes query all records in appointments table and display to console
      // The last record shown should be the record we just inserted
      db.each(
        "SELECT appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname info FROM Appointments",
        (err, row) => {
          console.log(
            row.appointmentdate +
              ": " +
              row.appointmenttime +
              ":" +
              row.professorname
          );
        }
      );

      res.render("confirmation.html", {
        ProfessorName: professorname,
        StudentName: studentfirstname + " " + studentlastname,
        AppointmentDate: appointmentdate,
        AppointmentTime: appointmenttime + ":00 AM",
        StudentNotes: studentnotes,
        StudentPhoneNumber: studentphonenumber,
      });
    }
  }); // End Webserver POST
}

function SetUpDatabase() {
  try {
    db.serialize(() => {
      db.run(
        "CREATE TABLE if not exists Appointments (appointmentdate text, appointmenttime text, professorname text, studentfirstname text, studentlastname text, studentphonenumber text, studentnotes text)"
      );
    });
  } catch {
    db.serialize(() => {
      // Table already created
      db.each(
        "SELECT appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname info FROM Appointments",
        (err, row) => {
          console.log(
            row.appointmentdate +
              ": " +
              row.appointmenttime +
              ":" +
              row.professorname
          );
        }
      );
    });
  }
}
