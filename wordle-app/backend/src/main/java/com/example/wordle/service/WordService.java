package com.example.wordle.service;

import com.example.wordle.model.Word;
import com.example.wordle.repository.WordRepository;
import org.springframework.stereotype.Service;

@Service
public class WordService {

    private final WordRepository wordRepository;

    public WordService(WordRepository wordRepository) {
        this.wordRepository = wordRepository;
    }

    public Word getRandomWord() {
        Word word = wordRepository.findRandomWord();
        if (word == null) {
            throw new IllegalStateException("No words available in database");
        }
        return word;
    }
}
