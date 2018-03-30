let fs = require("fs");

exports.stat = somePath => {
	return new Promise((resolve, reject) => {
		fs.stat(somePath, (err, r) => {
			if(err) {
				return reject(err);
			}
			resolve(r);
		});
	});
};

exports.readFile = (somePath, opts) => {
	return new Promise((resolve, reject) => {
		fs.readFile(somePath, opts, (err, r) => {
			if(err) {
				return reject(err);
			}
			resolve(r);
		});
	});
};
