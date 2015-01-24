"use strict"

var app = app || {};

app.game = (function() {
  function ajax(url) { 
    return Bacon.fromPromise($.get(url));
  }

  // needs to be refactored to reflect WPM instead of keys per second
  function calculate_speed(keys, seconds) {
    // according to http://www.typeonline.co.uk/typingspeed.php, words
    // per minute is not measured by actual words per minute, but five
    // keystrokes is equivalent to one word, so the measure is five
    // keystrokes per minute
    var minute = seconds / 60;
    var words = keys / 5;
    if (seconds !== 0)
      return Math.round(words / minute);
    else
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

  var chunk_text_stream = book_stream.flatMap(Bacon.fromArray).take(200).log();
  
  
  // cursor always starts at 0
  var cursor_location = 0;
  
  // creates a stream that emits the value 1 every second
  var seconds_passed = Bacon.interval(1000, 1).scan(0, function(a,b){ return a + b; });
  chunk_text_stream.onValue(function(val) { 
    $(".text-target").append(val);
  });

  
  $(document).ready(function() {
    var typed_keys = $(window)
        .asEventStream("keypress")
        .map(function(event) { 
          $(".text-typed").val("");
          return String.fromCharCode(event.keyCode || event.which); 
        });
    cursor_location = typed_keys.map(1).scan(0, function(a,b) { 
      return a + b; 
    });

   Bacon.zipWith(function(a, b) {
      console.log(a === b);
   }, typed_keys, chunk_text_stream).log();

    Bacon.fromArray(chunk_text_stream).onValue(function(val) {
      debugger;
    });
    
    Bacon.combineWith(calculate_speed, cursor_location, seconds_passed).onValue(function(val) {
      $(".speed").html(val);
    });
  });
})();
