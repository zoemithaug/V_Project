require('dotenv').config();
let express = require('express');
let nunjucks = require('nunjucks');
// let fetch = require('node-fetch');
// import fetch from 'fetch';
let bodyParser = require('body-parser');

// ✅ Do this if using JAVASCRIPT
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { response } = require('express');

let webserver = express();

nunjucks.configure('html', { autoescape: false, express: webserver });

//Body Parser Set Up
webserver.use(bodyParser.urlencoded({ extended: true }));

//Gobal database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservations.db');

const API_Key = process.env.API_KEY;
const API_Secret = process.env.API_SECRET;

webserver.listen(3000);

SetUpDatabase();
DisplayHomePage();
PostSchedule();


//Displaying Homepage 
function DisplayHomePage() {
  //Displaying Homepage after reading an HTML file locally
  webserver.get('/', function (req, res) {
    res.render('index.html', {
      // name: req.params.name
      name: 'Kevin'

    })
  });
}

//Student fills in info -> info sent to database -> Student receives text  message with info
function PostSchedule() {

  //POST /new Route Handler
  webserver.post('/schedule', function (req, res) {

    //Student info/variables collected from HTML form 

    var professorname = req.body.ProfessorName;
    var appointmentdate = req.body.AppointmentDate;
    var appointmenttime = req.body.AppointmentTime;

    var studentfirstname = req.body.studentfirstname;
    var studentlastname = req.body.studentlastname;
    var studentphonenumber = req.body.studentphonenumber;
    var studentnotes = req.body.studentnotes;

    //Text message info sent to Student 
    var message = "Dear " + studentfirstname + " " + studentlastname + "," + " you have successfully booked your appointment! Here are your additional notes: " + studentnotes;

    //res.send(studentfirstname);

    //JSON info object -> posted to Vonage -> so Vonage can send text
    let todo = {

      from: "18338510989",
      text: message,
      to: "18135145793",
      api_key: API_Key,
      api_secret: API_Secret
    };


    var ValidationCheck = true; //Assume success, prove otherwise
    var ErrorMessage = '';

    if (appointmentdate == '') {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Enter an appointment date</li>';

    } else if (appointmenttime == '' || !appointmenttime) {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Enter an appointment time</li>';


    } else if (professorname == '') {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Select a Professor</li>';


    } else if (studentfirstname == '') {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Enter a Student first name</li>';


    } else if (studentlastname == '') {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Enter a Student last name</li>';


    } else if (studentphonenumber == '') {

      ValidationCheck = false;
      ErrorMessage = ErrorMessage + '<li>Enter a mobile phone number</li>';


    }

    if (ValidationCheck == false) {


      res.render('error.html', {
        // name: req.params.name
        ProfessorName: professorname,
        StudentName: studentfirstname + ' ' + studentlastname,
        AppointmentDate: appointmentdate,
        AppointmentTime: appointmenttime,
        StudentNotes: studentnotes,
        StudentPhoneNumber: studentphonenumber,
        ErrorMessage: ErrorMessage

      })





    } else {

      //Posting data to Vonage & receiving success or failure 
      fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        body: JSON.stringify(todo),
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json())
        .then(json => console.log(json));

      // res.send(req.body);
      // res.redirect('/');

      //Build SQL string --> insert string to add record to appointments table 
      var sqlstring = 'INSERT INTO Appointments (appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname, studentphonenumber, studentnotes) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)';

      //Execute SQL string into database (Using paramaterized queries to prevent SQL injection)
      db.run(sqlstring, appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname, studentphonenumber, studentnotes);
      //For testing purposes query all records in appointments table and display to console
      //The last record shown should be the record we just inserted 
      db.each("SELECT appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname info FROM Appointments", (err, row) => {
        console.log(row.appointmentdate + ": " + row.appointmenttime + ":" + row.professorname);
      });



      res.render('confirmation.html', {
        // name: req.params.name
        ProfessorName: professorname,
        StudentName: studentfirstname + ' ' + studentlastname,
        AppointmentDate: appointmentdate,
        AppointmentTime: appointmenttime + ':00 AM',
        StudentNotes: studentnotes,
        StudentPhoneNumber: studentphonenumber

      })

    }

  }); // End Webserver POST



}


function SetUpDatabase() {

  try {
    db.serialize(() => {



      db.run("CREATE TABLE if not exists Appointments (appointmentdate text, appointmenttime text, professorname text, studentfirstname text, studentlastname text, studentphonenumber text, studentnotes text)");

    });

  } catch {

    db.serialize(() => {

      //Table already created
      db.each("SELECT appointmentdate, appointmenttime, professorname, studentfirstname, studentlastname info FROM Appointments", (err, row) => {
        console.log(row.appointmentdate + ": " + row.appointmenttime + ":" + row.professorname);
      });

    });


  }


  /* const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  for (let i = 0; i < 10; i++) {
  stmt.run("Ipsum " + i);
  }
  stmt.finalize();
  */




  // db.close();

}
