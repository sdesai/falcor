var gulp = require("gulp");
var beautify = require("gulp-beautify");
var distributeSweetCompile = require("./distribute-sweet-compile");
var browserify = require("gulp-browserify");
var rename = require("gulp-rename");
var surround = require("./surround");
var license = require("gulp-license");
var concat = require("gulp-concat");
var tvuiPrefix = "//@depend ../Rx.netflix.js\n" +
    "//@depend netflix/falcor/Falcor.js\n" +
    "(function(exports) {";
var tvuiPostfix = "exports.Model = Model;\n" +
    "}(netflix.falcor));";
var licenseInfo = {
    organization: "Netflix, Inc",
    year: "2014"
};
var support = [
    "./framework/ModelResponse.js",
    "./framework/request/Scheduler.js",
    "./framework/request/RequestQueue.js",
    "./framework/modelOperation.js",
    "./framework/Model.js",
    "./framework/PathLibrary.js"
];
var compile = [
    "./framework/Falcor.js",
    "./tmp/framework/Model.js",
    "./tmp/framework/support.js",
    "./tmp/framework/compiled_operations.js"
];

// build.macros -> |
// build.framework ->

gulp.task("build", ["clean.dev", "build.node", "build.tvui", "build.akira", "build.browser", "build.raw"]);
gulp.task("build.dev", ["clean.dev", "build.node"]);

gulp.task("build.macros", ["clean.dev"], function() {
    return gulp.src([
            // "./macros/*.sjs.js",
            "./macros/values/*.sjs.js",
            // "./macros/mixins/*.js",
            // "./macros/paths/*.js",
            // "./macros/keys/*.js",
            // "./macros/nodes/*.js",
            // "./macros/traversal/*.js",
            // "./macros/operations/*.js",
            "./functional-macros/*.js",
            "./functional-macros/keys/*.js",
            "./functional-macros/mixins/*.js",
            "./functional-macros/nodes/*.js",
            "./functional-macros/traversal/*.js",
        ]).
        pipe(concat({path: "macros.sjs.js"})).
        pipe(gulp.dest("tmp/framework"));
});

gulp.task("build.operations", ["build.macros"], function() {
    return gulp.
        src([
            "./functional-macros/operations/get/paths/*.js",
            "./functional-macros/operations/get/pathMaps/*.js",
            "./functional-macros/operations/set/paths/*.js",
            "./functional-macros/operations/set/pathMaps/*.js",
            "./functional-macros/operations/set/jsong/*.js",
            
            // "./framework/get/*.js",
            // "./framework/get/paths/*.js",
            // "./framework/get/pathMaps/*.js",
            
            // "./framework/set/*.js",
            // "./framework/set/paths/*.js",
            // "./framework/set/pathMaps/*.js",
            // "./framework/set/jsong/*.js",
            
            // "./framework/call/call.js",
            
            // "./framework/invalidate/*.js",
        ]).
        pipe(gulp.dest("tmp/framework/operations")).
        pipe(concat({path: "operations.js"})).
        pipe(gulp.dest("tmp/framework"));
});

gulp.task("build.compiled_operations", ["build.sweet"], function() {
    return gulp.
        src("./tmp/framework/compiled_operations/**.js").
        pipe(concat({path: "compiled_operations.js"})).
        pipe(gulp.dest("tmp/framework"));
});

gulp.task("build.sweet", ["build.operations"], function() {
    return distributeSweetCompile();
});

gulp.task("build.support", ["build.macros"], function() {
    return gulp.
        src(support).
        pipe(concat({path: "support.js"})).
        pipe(gulp.dest("tmp/framework"));
});

gulp.task("build.combine", ["build.compiled_operations", "build.support"], function() {
    return gulp.src(compile).
        pipe(concat({path: "Falcor.js"})).
        pipe(gulp.dest("tmp"));
});

gulp.task("build.akira", ["build.combine"], function() {
    return build("Falcor.akira.js", "./bin", function(src) {
        return src.
            pipe(surround({
                prefix: "import Rx from \"./rxUltraLite\";",
                postfix: "export default falcor;"
            }));
    });
});

gulp.task("build.support-only-compile", ['build.support-only-replace'], function() {
    return gulp.src(compile).
        pipe(concat({path: "Falcor.js"})).
        pipe(gulp.dest("tmp"));
});

gulp.task('build.support-only-replace', function() {
    return gulp.
        src(support).
        pipe(concat({path: "support.js"})).
        pipe(gulp.dest("tmp/framework"));
});

gulp.task('build.support-only', ['build.support-only-replace', 'build.support-only-compile'], function() {
    return build("Falcor.js", "./bin", function(src) {
        return src.
            pipe(surround({
                prefix: "\
var Rx = require(\"rx\");\n\
var Observable = Rx.Observable;\n",
                postfix: "module.exports = falcor;"
            }));
    });
});

gulp.task("build.node", ["build.combine"], function() {
    return build("Falcor.js", "./bin", function(src) {
        return src.
            pipe(surround({
                prefix: "\
var Rx = require(\"rx\");\n\
var Observable = Rx.Observable;\n",
                postfix: "module.exports = falcor;"
            }));
    });
});

gulp.task("build.tvui", ["build.combine"], function() {
    return build("Falcor.tvui.js", "./bin", function(src) {
        return src.
            pipe(surround({
                prefix: tvuiPrefix,
                postfix: tvuiPostfix
            }));
    });
});

gulp.task("build.browser", ["build.combine"], function() {
    return build("Falcor.browser.js", "./bin", function(src) {
        return src.
            pipe(surround({
                prefix: "var Rx = require(\"rx\");",
                postfix: "module.exports = falcor;"
            })).
            pipe(browserify({
                standalone: "falcor"
            }));
    });
});

gulp.task("build.raw", ["build.combine"], function() {
    return build("Falcor.raw.js", "./bin", function(src) {
        return src.
            pipe(browserify({
                standalone: "falcor"
            }));
    });
});

gulp.task("build.alone", ["build.combine"], function() {
    return build("Falcor.alone.js", "./bin", function(src) {
        return src;
    });
});

gulp.task("prod.node", ["build.combine"], function() {
    return build("Falcor.js", "./dist", function(src) {
        return src.
            pipe(surround({
                prefix: "\
var Rx = require(\"rx\");\n\
var Observable = Rx.Observable;\n",
                postfix: "module.exports = falcor;"
            }));
    });
});

gulp.task("prod.tvui", ["build.combine"], function() {
    return build("Falcor.tvui.js", "./dist", function(src) {
        return src.
            pipe(surround({
                prefix: tvuiPrefix,
                postfix: tvuiPostfix
            }));
    });
});

function build(name, dest, addBuildStep) {
    var src = gulp.src(["./tmp/Falcor.js"]);
    return addBuildStep(src).
        pipe(license("Apache", licenseInfo)).
        pipe(rename(name)).
        pipe(gulp.dest(dest));
}

module.exports = {
    build: build
};
  