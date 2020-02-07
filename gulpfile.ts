import * as gulp from 'gulp';
import * as ts from 'gulp-typescript';
import * as typescript from 'typescript';
import uglify from 'gulp-uglify-es';
import * as gzip from 'gulp-gzip';
import * as ejs from 'gulp-ejs';
import * as rename from 'gulp-rename';

import * as fs from 'fs';

let tsProject = (declaration: boolean = false) => ts.createProject('tsconfig.json', { typescript, declaration,  })();

gulp.task('build-types', () => gulp.src('./index.ts')
    .pipe(tsProject(true))
    .pipe(gulp.dest('./dist', { overwrite: false }))
);

gulp.task('build-app', () => gulp.src('./index.ts')
    .pipe(tsProject())
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
);

gulp.task('gzip-app', () => gulp.src('./dist/index.js')
    .pipe(gzip())
    .pipe(gulp.dest('./dist'))
);

gulp.task('build-docs', () => gulp.src('./docs/readme-template.ejs.md')
    .pipe<NodeJS.ReadWriteStream>(ejs({
        sizes: {
            min: () => (fs.statSync('./dist/index.js').size / 1000).toFixed(2),
            gzip: () => (fs.statSync('./dist/index.js.gz').size / 1000).toFixed(2)
        },
        example: (name: string) => {
            let file = fs.readFileSync(`./docs/examples/${name}.ts`).toString();
            let start = '//START';
            return file.substring(file.indexOf(start) + start.length).trim();
        }
    }))
    .pipe<NodeJS.ReadWriteStream>(rename('readme.md'))
    .pipe(gulp.dest('./'))
);

gulp.task('build', gulp.series('build-app', 'gzip-app', 'build-types', 'build-docs'));
