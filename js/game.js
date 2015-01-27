"use strict"

var app = app || {};

app.game = (function() {
  // provides a readable function for taking a url as input, and then
  // returning a stream representing the request / response
  function ajax(url) { 
    return Bacon.fromPromise($.get(url));
  } 

  // calculates words per minute (a word is five characters, not an
  // actual word)
  function calculate_speed(keys, seconds) {
    var minute = seconds / 60.0;
    var words = keys / 5.0;
    if (seconds > 0)
      return Math.round(words / minute);
    else // nothing typed yet provide this conditional branch to prevent division by zero error
      return 0;
  }

  // declare the Game prototype
  function Game(book, progress) {
    this.book = { title: book, text: "" };
    this.progress = progress; // point in text that player has reached
    this.fetch_book = function() {
      return ajax(this.book.title);
    }.bind(this);
  }

  // initialize a game
  var game = new Game("texts/mobydick.txt", 0);
  var book_stream = game.fetch_book();
  var buffer_length = 200;
  var blacklist = [];
  // cursor always starts at 0
  var cursor_location, total_keys, speed, output_stream, typed_keys, seconds_passed, chunk_text_stream, page;

  typed_keys = $(window)
    .asEventStream("keypress")
    .map(function(event) {
      event.preventDefault(); // prevents browser key shortcuts from firing
      return String.fromCharCode(event.keyCode || event.which); 
    });
  
  total_keys = typed_keys.map(1).scan(0, function(a,b) { 
    return a + b;
  });

  // create a stream to represent the currrent page number
  page = total_keys.map(function(key_total) {
    return Math.floor(key_total / buffer_length);
  });

  page.onValue(function(val) {
    console.log(val);
  });
  
  // create a text stream of the next 200 characters
  chunk_text_stream = book_stream
      .flatMap(Bacon.fromArray)
      .map(function(character) {
        if (character !== "\r" && character !== "\n" && character !== "\t" && character !== '')
          return character
        else
          return " "; 
      }).skip(0).take(buffer_length);
  
  // creates a stream that emits the value 1 every second
  // need to refactor this so that it does this 
  seconds_passed = Bacon.interval(1000, 1).scan(0, function(a,b){ return a + b; });


  cursor_location = total_keys.map(function(total, buffer) {
    return total % buffer_length;
  });

  chunk_text_stream.onValue(function(val) {
    var character = "";
    if (val === " ")
      $(".text-target").append("<span class='space'>_</span>");
    else
      $(".text-target").append("<span>" + val + "</span>");
  });
  

  // book stream with data about keys correctly/incorrectly typed 
  output_stream = Bacon.zipWith(function(typed_key, target_text_char, cursor_location) {
    return {
      cursor_location: cursor_location,
      target_text_char: target_text_char,
      correct_key: target_text_char===typed_key
    };
  }, typed_keys, chunk_text_stream, cursor_location)

  
  output_stream.onValue(function(val) { 
    if (val.correct_key) // correct typed
      $(".text-target > span:nth(" + val.cursor_location + ")").addClass("correct");
    else // incorrectly typed character
      $(".text-target > span:nth(" + val.cursor_location + ")").addClass("incorrect");
  });

  
  speed = Bacon.combineWith(calculate_speed, total_keys, seconds_passed);
  speed.onValue(function(val) {
    $(".speed").html(val);
  });

})();
