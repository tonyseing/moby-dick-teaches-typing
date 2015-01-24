"use strict"

var app = app || {};

app.game = (function() {
    function ajax(url) { 
        return Bacon.fromPromise($.get(url));
    }

    // needs to be refactored to reflect WPM instead of keys per second
    function calculate_speed(keys, seconds) {
        if (seconds !== 0)
            return keys / seconds;
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
    var chunk_stream = book_stream
        .map(function(book_text) {
            return book_text.substring(game.progress, game.progress + 500).split("");
        });
    // cursor always starts at 0
    var cursor_location = 0;
    
    // creates a stream that emits the value 1 every second
    var seconds_passed = Bacon.interval(1000, 1).scan(0, function(a,b){ return a + b; });
    seconds_passed.onValue(function(val) {
        //console.log(val);
    });

    chunk_stream.onValue(function(val) { 
        $(".text-target").html(val);
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
        cursor_location.onValue(function(val) { 
            //  console.log(val);
        });

        Bacon.combineWith(calculate_speed, cursor_location, seconds_passed).log();
    });
})();
