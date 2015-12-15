var less = require('gulp-less');
var path = require('path');
var gulp = require("gulp");
var rename = require("gulp-rename");
var nodemon = require('gulp-nodemon');
var browserify = require('browserify');
var reactify = require('reactify');
var notifier = require('node-notifier');
var source = require('vinyl-source-stream');
var colors = require('colors');
var yargs   = require('yargs').argv;

var nodeMonArgs = [];
if (yargs.port)
    nodeMonArgs = nodeMonArgs.concat(['--port', yargs.port.toString() ]) 


var errorNotify = function(error) {
  var message = 'In: ';
  var title = 'Error: ';

  if(error.description) {
    title += error.description;
  } else if (error.message) {
    title += error.message;
  }

  if(error.filename) {
    var file = error.filename.split('/');
    message += file[file.length-1];
  }

  if(error.lineNumber) {
    message += '\nOn Line: ' + error.lineNumber;
  }

  var e = {title: title, message: message};
  console.error(e)
  notifier.notify(e);
};


var b = browserify({
    entries: ['./assets/jsx/app.jsx'],
    transform: [reactify],
    extensions: ['.jsx'],
    debug: true 
});

gulp.task('build', function() {
    b.bundle()
    .on('error', errorNotify)
    .pipe(source('main.js'))
    .pipe(gulp.dest('./assets/js/dist'))
});

gulp.task('less', function () {
  return gulp.src('./assets/css/import.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(rename('style.css'))
    .pipe(gulp.dest('./assets/css'));
});

gulp.task('develop', function () {
  nodemon({ script: 'server.js'
          , ext: 'html js less jsx'
          , ignore: ['assets/js/dist/*']
          , args: nodeMonArgs
          , tasks: ['less', "build"] })
    .on('restart', function () {
      console.log('restarted!')
    })
});