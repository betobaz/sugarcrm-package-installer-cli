const gulp = require('gulp');
const nconf = require('nconf');
const minimist = require('minimist');
const archiver = require('archiver');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path'); 

const knownOptions = {
  "omit-build-packages": false,
  "omit-install": false
};

const options = minimist(process.argv.slice(2), knownOptions);
const project_name = options.project;

if(!project_name){
  console.error("Especifique el projecto");

  // TODO listar los projectos
  process.exit();
}


gulp.task('help', () => {
  console.log("gulp --project <project_name>");
  console.log("gulp --project <project_name> --omit-build-packages");
});

nconf.file({ file: "config.json" });
var project_conf = nconf.get('projects:'+project_name);
var dependencies = [];
const build_dir = project_conf.packages_dir+"/build";

gulp.task('get_dependencies', () => {
  if (fs.existsSync(project_conf.packages_dir+"/Merxfile.json")) { 
    console.log("Merxfile.json existe");
    let merxfile = JSON.parse(fs.readFileSync(project_conf.packages_dir+"/Merxfile.json"), 'utf8'); 
    dependencies = Object.keys(merxfile.dependencies);
  } 
  else{
    dependencies = Object.keys(project_conf.dependencies);
  }
  shell.mkdir('-p', build_dir);
});

gulp.task('build_packages', () => {
  
  shell.cd(project_conf.packages_dir);
  dependencies.forEach((item) => {
    shell.cd(item);
    var command = "zip -r " + build_dir + "/"+item + ".zip . -x .DS_Store *.md"; 
    shell.exec(command, {silent:true});
    shell.cd('..');
  });
});

gulp.task('install_packages', function() {
  if(options['omit-install']) return false;
  shell.cd(__dirname);
  shell.cp("cliModuleInstall.php", project_conf.instance_dir);
  shell.cd(project_conf.instance_dir);
  dependencies.forEach((item) => {
    if (!fs.existsSync(project_conf.instance_dir + "/upload/upgrades/module/"+ item +".zip")) { 
   	 shell.cp(build_dir + "/" + item +".zip", project_conf.instance_dir + "/upload/upgrades/module/" );
    }
    console.log("Instalando Paquete");
    var command = "./cliModuleInstall.php -i " + project_conf.instance_dir + " -z " + build_dir + "/"+item+".zip";
    console.log("command: ", command);
    //shell.exec(command, {silent:true});
    shell.exec(command);
    console.log("Paquete Instalado");

    console.log("Reparando Instancia");
    var command = "php repair.php";
    shell.exec(command);
    console.log("Instancia Reparada");
  });
});

gulp.task('default', ["get_dependencies", "build_packages", "install_packages"]);
