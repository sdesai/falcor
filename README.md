# Falcor [![Build Status](https://magnum.travis-ci.com/Netflix/falcor.svg?token=2ZVUVaYjVQbQ8yiHk8zs&branch=master)](https://magnum.travis-ci.com/Netflix/falcor) [![Coverage Status](https://coveralls.io/repos/Netflix/falcor/badge.svg?branch=master&t=ntL3St)](https://coveralls.io/r/Netflix/falcor?branch=master)

## What is Falcor?

Every user wants to believe all the data in the cloud is stored on their device. Falcor lets web developers code that way.  

Falcor lets you represent all of your cloud data sources as *One Virtual JSON Model* on the server. On the client you code as if the entire JSON model is available locally, retrieving and setting values at keys. Falcor retrieves any data you request from the cloud on-demand, handling network communication transparently. Netflix uses Falcor to efficiently download and cache catalog data.

Falcor is not a replacement for your MVC framework, your database, or your application server. Instead you add Falcor to your existing stack to optimize client/server communication. Falcor is ideal for mobile apps, because it combines the caching benefits of REST with the low latency of RPC.

You retrieve data from a Falcor model using the familiar JavaScript path syntax. 

```JavaScript
var person = {
    name: "Steve McGuire",
    occupation: "Developer",
    location: {
      country: "US",
      city: "Pacifica",
      address: "344 Seaside"
    }
}

print(person.location.address);
```

This is the way you would retrieve data from the same JSON in a remote Falcor Model.  Note that the only difference is that the API is asynchronous.

```JavaScript
var person = new falcor.Model({
  source: new falcor.HttpSource("/person.json")
});

person.getValue("location.address").
  then(address => print(address));

// outputs "344 Seaside"
```

## How does Falcor work?

### Retrieving Data from the Model

Falcor allows you to build a *Virtual JSON Model* on the server. The virtual model exposes all of the data that the client needs at a single URL on the server (ex. /model.json). On the client you can retrieve data from the virtual model by setting and retrieving keys, just as you would from any JSON object stored in memory.

In this example the client requests several values from the virtual model on the server and then displays them on-screen.

```JavaScript
var person = new falcor.Model({
  source: new falcor.HttpSource("/person.json")
});

person.get("name", "location.city", "location.address").
  then(json => display(json));
```

When a client requests paths from the model, the model attempts to retrieve the data from its in-memory cache. If the data is not found in the local cache, the following GET request is sent to the virtual model on the server.
```
http://{yourdomain}/person.json?paths=[["name"], ["location", "city"], ["location", "address"]]
```

Note that rather than retrieve data from multiple endpoints, all of the data in the virtual model is exposed as single JSON resource. This means that the client can retrieve as much or as little of the graphAs is required in a single HDP request. Furthermore each resource

 and the requested paths within the JSON object are passed in the query string. Disallows the

The virtual JSON model on the server responds with a fragment of the virtual JSON model containing only the requested values. 

```
HTTP/1.1 200 OK
Content-Length: length
Content-Type: application/json; charset=utf-8
Content-Control: no-cache

{
  "paths": [["name"], ["location", "city"], ["location", "address"]],
  "value": {
    "name": "Steve McGuire",
    "occupation": "Developer",
    "location": {
      "city": "Pacifica",
      "address": "344 Seaside"
    }
  }
}
```

Upon receiving the requested data, the client merges the JSON fragment with a template and displays it. 


```hbs
<script id="person-template" type="text/x-handlebars-template">
  <span{{name}} lives at {{location.address}}, {{location.city}}</span>
</script>
```

```JavaScript
var source   = $("#entry-template").html();
var template = Handlebars.compile(source);

function display(json) {
  // json is...
  // {
  //   "name": "Steve McGuire",
  //   "location": {
  //     "city": "Pacifica",
  //     "address": "344 Seaside"
  //   }
  // }

  document.body.innerHTML = template(json);
}
```

Each JSON fragment returned from the server is added to the local cache. Subsequent queries for the same paths do not result in a network request.

```JavaScript

print(JSON.stringify(person.getCache(), null, 2));
// prints
// {
//   "name": "Steve McGuire",
//   "location": {
//     "city": "Pacifica",
//     "address": "344 Seaside"
//   }
// }

// prints the name without making a network request.
person.
  getValue("name").
  then(print));

```

### Building the Virtual Model on the Server

The reason that the server model is called "virtual" is that the server JSON Object typically does not exist in memory or on disk. *A Falcor virtual model is like a little application server hosted at a single URL.* Instead of matching URL paths, the virtual model router matches one or more paths through a a single JSON model. The virtual model generates the requested subset of the JSON model on-demand by loading the data from one or more backend data stores.

The following virtual model simulates a person model on the server:

```JavaScript
// Server
var falcor = require("falcor");
var falcorExpress = require("falcor");

var express = require("express");
var app = express();

var person = new falcor.Model({
  router: new falcor.Router([
    {
      route: ["name","occupation"],
      get: (pathSet) => 
        personDB.
          exec(`SELECT ${pathSet[1].join(",")}
                  FROM user 
           WHERE id = ${request.cookies.userid}`)
    },
    {
      route: ["location",["country", "city", "address"]],
      get: (pathSet) => 
        locationServer.
          getLocation(request.cookies.userid).
          then(location => ({
            person: { location: getProps(location, pathSet[2]) } 
          })
    }
  ])
});

var modelServer = new falcor.HttpModelServer(person);

app.get("/person.json", function (req, res) {
  falcorExpress.serve(req, function(error, output) {
    res.end(output)
  });
});

var server = app.listen(80);
```

The virtual model exposes the entire JSON model at a single URL and accepts one or more paths in the query string. This allows the client to request as much of the graph as it needs within in a single HTTP request. 

## Additional Resources

For a series of short video tutorials on how to get started with Falcor check out [this series](https://www.youtube.com/playlist?list=PL-7Rk5Igg3dfdxlNKNSMJHfK_yG5ceiZf).

For detailed high-level documentation explaining the Model, the Router, and JSON Graph check out the [Falcor website](http://netflix.github.io/falcor).

For API documentation, go [here](http://netflix.github.io/falcor/doc/Model.html)

For a working example of a Router, check out the [falcor-router-demo](http://github.com/netflix/router-demo).
