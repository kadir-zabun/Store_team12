package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User,String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    @Query("{ 'userId' : ?0 }")
    Optional<User> findByUserId(String userId);
}