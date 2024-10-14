var allowedVidIdChars = 'abcdefghijklmnopqrstuvwxyz0123456789_-'

var fs = require('fs')
var express = require('express')
var app = express()

const logname = __dirname + "/logs/" + Date().split(" GMT")[0] + ".log"
function Logger(data) {
  fs.appendFile(logname, '@<' + Date.now() + '>:[' + data + ']\n', function(err) {
    if (err) throw err;
    console.log(data);
  });
}

app.get('/',function(req,res) {
//  res.redirect('/404')
  res.sendFile(__dirname + '/index.html');
});

app.get('/watch*', function(_, res) {
  res.sendFile(__dirname + '/watch.html');
});

var pathModule = require('path')
var multer = require('multer')
var ejs = require('ejs')
var fName = ''
	
// var upload = multer({ dest: "Upload_folder_name" })
// If you do not want to use diskStorage then uncomment it
	
var storage = multer.diskStorage({
	destination: function (req, file, cb) {

		// Uploads is the Upload_folder_name
		cb(null, "content/videos")
	},
	filename: function (req, file, cb) {
	cb(null, file.originalname)
	}
})
	
// Define the maximum size for uploading
// picture i.e. 1 MB. it is optional
const maxSize = 1 * 1000 * 1000;
	
var upload = multer({
	storage: storage,
	// limits: { fileSize: maxSize },
	fileFilter: function (req, file, cb, vidId){
	
		// Set the filetypes, it is optional
//		var filetypes = /jpeg|jpg|png/;
		var mimetype = /*filetypes.test(*/file.mimetype/*)*/;

		var extname = /*filetypes.test(*/pathModule.extname(file.originalname).toLowerCase()/*)*/;
		
		if (mimetype && extname) {
      fName = vidId
			return cb(null, true);
		}
	
		//cb("Error: File upload only supports the "
		//		+ "following filetypes - " + filetypes);
	}

// mypic is the name of file attribute
}).single("myfile");	

app.post("/uploadFile",function (req, res, next) {
  function randChar(num=1) {
    return allowedVidIdChars[Math.floor(Math.random() * allowedVidIdChars.length)]
  }
  
  var isAuthenticated = false
	// Error MiddleWare for multer file upload, so if any
	// error occurs, the image would not be uploaded!
  fs.readFile('./creds.json', 'utf8', (error, data) => {
     if (error){
        console.log(error);
        return;
     }
    else {
      data = JSON.parse(data)
      let uName = atob(req.query.uname)
      let passW = atob(req.query.passw)
      let isUrl = false
      data['authorized_urls'].forEach(u => {
        u = u.split('://')[1]
        if (req.hostname === u) isUrl = true
      })
      if (uName === data['uname'] && passW === data['passw'] && isUrl) {
        isAuthenticated = true;
        fs.readFile('./db/video_ids.json', 'utf8', (error, data) => {
          if (error){
            console.log(error);
            return;
          }
          else {
            data = JSON.parse(data)
            let hasVideoId = true
            let generatedVideoId = randChar(5)
            while (generatedVideoId.endsWith('_') || generatedVideoId.endsWith('-')) {
              generatedVideoId = generatedVideoId.substring(0, generatedVideoId.length-1)
              generatedVideoId = `${generatedVideoId}${randChar()}`
            }
            while (hasVideoId) {
              data.forEach(function(id, i) {
                if (generatedVideoId === id) {
                  hasVideoId = true
                  generatedVideoId = `${generatedVideoId}${randChar()}`
                  while (generatedVideoId.endsWith('_') || generatedVideoId.endsWith('-')) {
                    generatedVideoId = generatedVideoId.substring(0, generatedVideoId.length-1)
                    generatedVideoId = `${generatedVideoId}${randChar()}`
                  }
                }
                else hasVideoId = false
              })
            }
      	    upload(req,res,function(err) {
      		    if(err) {
      			    // ERROR occurred (here it can be occurred due
      			    // to uploading image of size greater than
      			    // 1MB or uploading different file type)
      			    res.send(err)
      		    }
      		    else {
      			    // SUCCESS, image successfully uploaded
      			    res.send(`<script>location.href = '/watch?v=${generatedVideoId}'</script>`)
      		    }
      	    }, generatedVideoId)
          }
        })
      }
      else {
        res.send(`ERROR: Unauthorized check creds.json in file browser for details.`)
      }
    }
   })
  if (isAuthenticated) {
  }
})
	
app.get("/uploadFile",function (req, res) {
  res.redirect(req.originalUrl.split('File')[0])
})

app.get('*', function(req, res) {
  let page = req.originalUrl.split('?')[0]
  var params = req.query
  let redirect = false
  var status = false
  let hasFile = true
  let newPage = page.substring(0, page.split('').length - 1).split('/')[page.substring(0, page.split('').length - 1).split('/').length - 1].includes('.')
  if (page.endsWith('/')) {
    page = page.substring(0, page.split('').length - 1)
    if (newPage) {
      redirect = 'error'
    }
    else if (newPage === false) {
      redirect = true
    }
  }
  let file = '/index.html'
  if (page.split('/')[page.split('/').length - 1].includes('.')) {
    file = `/${page}`
  }
  else {
    file = `/${page}.html`
  }
  if (!!fs.existsSync(`${__dirname}/${file}`) === false || params.error === '' || (req.originalUrl.startsWith('/members') && !!params.m)) {
    file = '/404.html'
    hasFile = false
    status = 404
  }
  if ((redirect && redirect !== 'error') && hasFile) {
    res.redirect(page)
  }
  else if (!!redirect && (hasFile === false || redirect === 'error')) {
    res.redirect(`${page}?error&referer=${req.originalUrl}`)
  }
  else {
    if (!!status) {
      if (status === 404 && page !== '/favicon.ico') {
        console.error(`A user navigated to "${req.originalUrl}" and the file "${file}" was displayed to the user.`)
        Logger(`A user navigated to "${req.originalUrl}" and the file "${file}" was displayed to the user.`)
      }
      res.status(status).sendFile(`${__dirname}/${file}`)
    }
    else {
      res.sendFile(`${__dirname}/${file}`)
    }
  }
});

app.listen(3000)
