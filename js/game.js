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

  var chunk_text_stream = book_stream.flatMap(Bacon.fromArray).take(200);
  
  
  // cursor always starts at 0
  var cursor_location = 0;
  
  // creates a stream that emits the value 1 every second
  var seconds_passed = Bacon.interval(1000, 1).scan(0, function(a,b){ return a + b; });
  
  
  $(document).ready(function() {
    var typed_keys = $(window)
        .asEventStream("keypress")
        .map(function(event) {
          event.preventDefault(); // prevents browser key shortcuts
          // from firing
          return String.fromCharCode(event.keyCode || event.which); 
        });

    
    cursor_location = typed_keys.map(1).scan(0, function(a,b) { 
        return a + b; 
    });

    chunk_text_stream.onValue(function(val) {
      $(".text-target").append("<span>" + val + "</span>");}                             );
    
    // Creates a stream of 2-tuples that represent
    // [book_text_character, whether the typed key matched the target
    // character ]
    //
      // book stream with data about keys correctly/incorrectly typed 
    var output_stream = Bacon.zipWith(function(typed_key, target_text_char, cursor_location) {
      return [cursor_location, target_text_char, target_text_char===typed_key];
    }, typed_keys, chunk_text_stream, cursor_location)//.merge(chunk_text_stream);

  
   
    
    
    output_stream.onValue(function(val) { 

      if (val[2]) // correct typed
        $(".text-target > span:nth(" + val[0] + ")").addClass("correct");
      else // incorrectly typed character
        $(".text-target > span:nth(" + val[0] + ")").addClass("incorrect");
    });

    
    Bacon.combineWith(calculate_speed, cursor_location, seconds_passed).onValue(function(val) {
      $(".speed").html(val);
    });
  });
})();
