package com.example.wordle.controller;

import com.example.wordle.dto.WordResponse;
import com.example.wordle.model.Word;
import com.example.wordle.service.WordService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WordController {

    private final WordService wordService;

    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    // returns a random word plus its hint
    @GetMapping("/word")
    public WordResponse getRandomWord() {
        Word word = wordService.getRandomWord();
        return new WordResponse(word.getWord(), word.getHint());
    }
}
