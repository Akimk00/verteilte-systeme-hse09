package com.example.wordle.repository;

import com.example.wordle.model.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WordRepository extends JpaRepository<Word, String> {

    // random row, Postgres
    @Query(value = "SELECT * FROM words ORDER BY random() LIMIT 1", nativeQuery = true)
    Word findRandomWord();
}
