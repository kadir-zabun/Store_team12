package org.example.onlinestorebackend.Util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String SECRET_KEY;

    // Tek (süresiz) token üret
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    // Token’dan kullanıcı adını (subject) al
    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    // Token geçerli mi? (subject tutuyor mu ve imza/format sağlam mı)
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username != null && username.equals(userDetails.getUsername());
        // Not: exp kontrolü yok; token süresizdir.
    }

    // ---- Private ----

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // exp olmadan genel token oluşturucu
    private String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        JwtBuilder builder = Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                // .setExpiration(...) YOK — süresiz
                .signWith(getSignInKey()); // jjwt 0.11.x için .signWith(key, SignatureAlgorithm.HS256) da kullanabilirsin

        return builder.compact();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
