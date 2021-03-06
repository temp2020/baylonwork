const express = require("express");
const stripe = require("stripe")("sk_test_GLcz4Yc3FRghFx6M9GnmpU0k00ne6LUnGh");
const app = express();
const bodyParser = require("body-parser");
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { basicCORSHeaders } = require("./util");
const { apiLimiter } = require("./limiters");
const config = require("./config");
const twitterRouter = require("./twitterRouter")(config);
const apiRouter = require("./router");
const firebase = require("firebase-admin");
const multer = require("multer");
const nodemailer = require("nodemailer");
const serviceAccount = require("./serviceAccountKey.json");
let fs = require('fs-extra');


firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://gunproject-64f84.firebaseio.com"
});

const db = firebase.database();
const ref = db.ref("membership");
ref.once("value", function (snapshot) {
  console.log(snapshot.val());
});

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "Dzianis.papchanka@gmail.com",
    pass: "72F08eGhsoVfjw2rf3"
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.io = io;

/**
 * Some basic io feedback.
 */
io.on("connection", function (socket) {
  io.emit("this", { will: "be received by everyone" });

  /*  socket.on('private message', function (from, msg) {
          console.log('I received a private message by ', from, ' saying ', msg);
      });*/

  socket.on("disconnect", function () {
    io.emit("user disconnected");
  });
});

server.listen(config.port);
// WARNING: app.listen(80) will NOT work here!

app.set("view engine", "ejs");
app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)

/* stripe.products.create({
  name: 'Goatgunmembership',
  type: 'service',
}, function(err, product) {
  console.log(JSON.stringify(product.id));
});  */
/* stripe.plans.create(
  {
    amount: 00,
    nickname: "GoatGunFree",
    interval: "year",
    product: "prod_FPwvtUxdmNRCer",
    currency: "usd"
  },
  function(err, plan) {
    // asynchronously called
    console.log(JSON.stringify(plan.id));
  }
); */

app.use(basicCORSHeaders);
var storage = multer.diskStorage({
  //multers disk storage settings
  destination: function (req, file, cb) {
    cb(null, "../dist/gun-customizer/assets/img/patterns/pattern");
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
    // cb(null, datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    cb(null, file.originalname);
  }
});
var storage2 = multer.diskStorage({
  //multers disk storage settings
  destination: function (req, file, cb) {
    cb(null, "../src/assets/img/patterns/pattern");
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
    // cb(null, datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    cb(null, file.originalname);
  }
});

var storage3 = multer.diskStorage({
  //multers disk storage settings
  destination: function (req, file, cb) {
      let uid = req.params.uid;
      let path = `../dist/gun-customizer/assets/img/patterns/pattern/${uid}`;
      fs.mkdirsSync(path);
    cb(null, path);
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
    // cb(null, datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    cb(null, file.originalname);
  }
});

var storage4 = multer.diskStorage({
  //multers disk storage settings
  destination: function (req, file, cb) {
      let uid = req.params.uid;
      let path = `../src/assets/img/patterns/pattern/${uid}`;
      fs.mkdirsSync(path);
    cb(null, path);
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
    // cb(null, datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    cb(null, file.originalname);
  }
});

var upload = multer({
  //multer settings
  storage: storage
}).single("uploads");
var upload2 = multer({
  //multer settings
  storage: storage2
}).single("uploads");
var upload3 = multer({
  //multer settings
  storage: storage3
}).single("uploads");
var upload4 = multer({
  //multer settings
  storage: storage4
}).single("uploads");
/** API path that will upload the files */
app.post("/upload", function (req, res) {
  console.log(req);
  upload(req, res, function (err) {
    if (err) {
      res.json({ error_code: 1, err_desc: err });
      return;
    }
    res.json({ error_code: 0, err_desc: null });
  });
  upload2(req, res, function (err) {
    if (err) {
      //res.json({error_code:1,err_desc:err});
      return;
    }
    //res.json({error_code:0,err_desc:null});
  });
});

app.post("/uploadMine/:uid", function (req, res) {
  const uid = req.params.uid;
  upload3(req, res, function (err) {
    if (err) {
      console.log('errror');
      res.json({ error_code: 1, err_desc: err });
      return;
    }
    console.log('success');
    res.json({ error_code: 0, err_desc: null });
  });
  upload4(req, res, function (err) {
    if (err) {
      //res.json({error_code:1,err_desc:err});
      return;
    }
    //res.json({error_code:0,err_desc:null});
  });
});
app.post("/payme", (req, res) => {
  const { plan, userid, email, token } = req.body;
  console.log(plan);

  const planId = getPricingPlanId(plan);
  stripe.customers
    .create({
      email: email,
      source: token
    })
    .then(customer =>
      stripe.subscriptions.create(
        {
          customer: customer.id,
          items: [
            {
              plan: planId
            }
          ]
        },
        function (err, subscription) {
          const { id, plan } = subscription;
          if (err) {
            throw err;
          }
          res.status(200).send({
            planName: plan.nickname,
            success: true,
            message: "Payment Success"
          });
          const usersRef = ref.child(userid);
          usersRef.set({
            subscriptionId: id,
            planId: plan.id,
            planName: plan.nickname
          });
        }
      )
    );
});

app.post("/changeplan", async (req, res) => {
  const { plan, userid, token, membership } = req.body;
  const { subscriptionId } = membership;
  const planId = getPricingPlanId(plan);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  stripe.subscriptions.update(
    subscriptionId,
    {
      cancel_at_period_end: false,
      items: [
        {
          id: subscription.items.data[0].id,
          plan: planId
        }
      ]
    },
    function (err, subscription) {
      const { id, plan } = subscription;
      console.log(id + plan);
      if (err) {
        throw err;
      }
      res.status(200).send({
        planName: plan.nickname,
        success: true,
        message: "Payment Success"
      });
      const usersRef = ref.child(userid);
      usersRef.set({
        subscriptionId: id,
        planId: plan.id,
        planName: plan.nickname
      });
    }
  );
});

app.post("/sendMail", (req, res) => {
  // getting dest email by query string
  const dest = "gunner@goatguns.com, surlsm635@gmail.com";
  const subject = req.body.thread;
  const user = req.body.user;
  const avatar = user.avatarURL;
  const username = user.username;
  const useremail = user.email;
  const content = req.body.content;

  const mailOptions = {
    from: `${username} <Dzianis.papchanka@gmail.com>`, // sender address
    to: dest, // list of receivers
    subject: subject, // Subject line
    html: `<html>
            <head><style>
              #avatar {
                border-radius: 50%;
                width: 50px;
              }
            </style>
            <head>
            <body>
            <p>Hi, Bo .</p>
            <p>User ${username}(${useremail}) wrote a message to you.</p>
            <table>
            <tr>
                  <td align="center"><img src=${avatar} id="avatar" ></td>
            </tr>
            <tr>
                  <td><h3>${subject}</h3></td>
            </tr>
            <tr>
                  <td><h4>${content}</h4></td>
            </tr>
            <tr>
                  <td align="center">you can send email him by clicking <a href = "mailto: ${useremail}">Reply him</a></td>
            </tr>

            </table>
            </body>
            </html>` // plain text body
  };
  transporter.sendMail(mailOptions, function (err, info) {
    if (err) res.send(err.toString());
    else res.send("Sended");
  });
  // returning result
  /*  return transporter.sendMail(mailOptions, (erro, info) => {
        if(erro){
            return res.send(erro.toString());
        }
        return res.send('Sended');
    }); */
});

app.use("/", express.static(config.publicLocation));
app.use("/images", express.static(config.storageLocation));
app.use("/api", apiLimiter, apiRouter);
app.use("/twitter", apiLimiter, twitterRouter);

console.log("server started, listening on port:", config.port);

function getPricingPlanId(plan) {
  let planId;
  switch (plan) {
    case "goatgunfree":
      planId = "plan_GN0EZraZI7T4lz";
      break;
    case "goatgunbasic":
      planId = "plan_GN07lNVjpQGxkz";
      break;
    case "goatgunpro":
      planId = "plan_GN08cQY33hXLmS";
      break;
    case "goatgunbasicyearly":
      planId = "plan_GN0BdH5sUU2nBB";
      break;
    case "goatgunproyearly":
      planId = "plan_GN0AYpN7jfCXh2";
      break;
    default:
      planId = "plan_GN0EZraZI7T4lz";
  }

  return planId;
}
