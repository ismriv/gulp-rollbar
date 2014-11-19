## gulp-rollbar  [![NPM version][npm-image]][npm-url]

### Usage

```javascript
var gulp = require('gulp');
var plugin1 = require('gulp-plugin1');
var plugin2 = require('gulp-plugin2');
var sourcemaps = require('gulp-sourcemaps');
var rollbar = require('gulp-rollbar');

gulp.task('javascript', function() {
  gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(plugin1())
    .pipe(plugin2())
    .pipe(rollbar({
      accessToken: '31415926535897932384626433832795',
      version: 'c7519b7848a7016f94900be178afbef9bc6f103b',
      sourceMappingURLPrefix: 'https://example.com'
    }))
    .pipe(gulp.dest('dist'));
});
```
