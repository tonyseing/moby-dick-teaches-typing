"use strict"

// declare the Game prototype
function   Game(book, progress) {
  this.book = { title: book, text: "" };
  this.progress = progress; // point in text that player has reached
  this.fetch_book = function() {
    return Bacon.fromPromise($.get(this.book.title));
  }.bind(this);
}

// initialize a game
var game = new Game("texts/mobydick.txt", 0);

var book_stream = game.fetch_book();

var chunk_stream = book_stream
    .flatMap(function(book_text) {
      return book_text.substring(game.progress, game.progress + 100).split("");
    }).log();



chunk_stream.toProperty().assign($(".text-target"), "html");

$(document).ready(function() {
  var typed_keys = $(".text-typed")
      .asEventStream("keypress")
      .map(function(event) { return event.target.value; }).merge(chunk_stream).log();
  

});
