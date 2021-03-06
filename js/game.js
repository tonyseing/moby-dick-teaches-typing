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
      return words / minute;
    else // nothing typed yet provide this conditional branch to prevent division by zero error
      return 0;
  }

  function calculate_accuracy(correct_keys, total_keys) {
    if (total_keys === 0)
      return 0;
    else
      return (correct_keys / total_keys) * 100;
  }

  function fetch_book(book_title) {
      return ajax(book_title);
  }
  
  // declare the Game prototype
  function Game(book, progress) {
    this.book = { title: book, text: "" };
    this.progress = progress; // point in text that player has reached
  }

  function clear_display() {
    $(".text-target").html("");
  }

  // initialize a game
  var game = new Game("texts/mobydick.txt", 0);
  var book_stream = fetch_book(game.book.title);
  var buffer_length = 300;
  var blacklist = [];
  // cursor always starts at 0
  var cursor_location, total_keys, speed, output_stream, typed_keys, seconds_passed, sanitized_text_stream, page;
  
  typed_keys = $(window)
    .asEventStream("keypress")
    .map(function(event) {
      event.preventDefault(); // prevents browser key shortcuts from firing
      return String.fromCharCode(event.keyCode || event.which); 
    });
  
  total_keys = typed_keys.map(1).scan(0, function(a,b) { 
    return a + b;
  }).toProperty();

  // create a stream to represent the currrent page number
  page = total_keys.map(function(key_total) {
    return Math.floor(key_total / buffer_length);
  }).skipDuplicates();

  page.onValue(clear_display);
  
  // create a text stream of the next 200 characters
  // returns a stream of array values
  sanitized_text_stream = book_stream
  // replace in book (string) all multiple spaces with a single space,
    .map(function(book) {
      return Bacon.fromArray(book.replace(/\s{2,}/g, " "));
    });


  var text_chunk = Bacon.combineWith(function(text_stream, page) {
    return text_stream.take(buffer_length);
  }, sanitized_text_stream, page).flatMap(function(val) { return val; });
  
  // creates a stream that emits the value 1 every second
  // need to refactor this so that it does this 
  seconds_passed = Bacon.interval(1000, 1).scan(0, function(a,b){ return a + b; });

  cursor_location = total_keys.map(function(total, buffer) {
    return total % buffer_length;
  });

  text_chunk.onValue(function(text_arr) {
    $(".text-target").append("<span>" + text_arr + "</span>");
  });

  // book stream with data about keys correctly/incorrectly typed 
  output_stream = Bacon.zipWith(function(typed_key, target_text_char, cursor_location) {
    return {
      cursor_location: cursor_location,
      target_text_char: target_text_char,
      correct_key: target_text_char===typed_key
    };
  }, typed_keys, text_chunk, cursor_location);
  
  output_stream.onValue(function(val) { 
    if (val.correct_key) // correct typed
      $(".text-target > span:nth(" + val.cursor_location + ")").addClass("correct");
    else // incorrectly typed character
      $(".text-target > span:nth(" + val.cursor_location + ")").addClass("incorrect");
  });

  var correct_keys = output_stream.filter(function(output) { return output.correct_key }).map(1).scan(0, function(a,b) { return a + b; });
  var accuracy = Bacon.combineWith(calculate_accuracy, correct_keys, total_keys);
  accuracy.onValue(function (val) {
    $(".accuracy").html(Math.round(val) + "%");
  })
  
  speed = Bacon.combineWith(calculate_speed, total_keys, seconds_passed);
  speed.onValue(function(val) {
    $(".speed").html(Math.round(val));
  });

})();
