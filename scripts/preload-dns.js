const dns = require("dns");
const orig = dns.lookup;

dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  orig.call(dns, hostname, options, (err, address, family) => {
    if (err && err.code === "ENOTFOUND") {
      dns.resolve6(hostname, (e6, addrs6) => {
        if (e6) {
          dns.resolve4(hostname, (e4, addrs4) => {
            if (e4) return callback(err);
            callback(null, addrs4[0], 4);
          });
        } else {
          if (options.all) return callback(null, addrs6.map((a) => ({ address: a, family: 6 })));
          callback(null, addrs6[0], 6);
        }
      });
    } else {
      callback(err, address, family);
    }
  });
};
