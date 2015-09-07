var less = require('gulp-less');
var path = require('path');
var gulp = require("gulp");
var rename = require("gulp-rename");
var nodemon = require('gulp-nodemon');
var yargs   = require('yargs').argv;
 
var nodeMonArgs = [];
if (yargs.port) {
    nodeMonArgs = nodeMonArgs.concat(['--port', yargs.port.toString() ]) 
}

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
          , ext: 'html js less'
          , args: nodeMonArgs
          , tasks: ['less'] })
    .on('restart', function () {
      console.log('restarted!')
    })
})