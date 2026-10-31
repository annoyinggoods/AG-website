// The body of a request from the panel, read as JSON.

export async function readBody(request) {
  return new Promise(function (resolve, reject) {
    let raw = "";
    request.on("data", function (chunk) {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("The request is too large."));
        request.destroy();
      }
    });
    request.on("end", function () {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("The request body is not valid JSON."));
      }
    });
    request.on("error", reject);
  });
}
