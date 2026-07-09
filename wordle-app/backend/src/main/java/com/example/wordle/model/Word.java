package com.example.wordle.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Model: one row = one playable word
@Entity
@Table(name = "words")
public class Word {

    @Id
    @Column(name = "word", length = 5, nullable = false)
    private String word;

    @Column(name = "hint", nullable = false)
    private String hint;

    protected Word() {
        // JPA default
    }

    public Word(String word, String hint) {
        this.word = word;
        this.hint = hint;
    }

    public String getWord() {
        return word;
    }

    public String getHint() {
        return hint;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public void setHint(String hint) {
        this.hint = hint;
    }
}
