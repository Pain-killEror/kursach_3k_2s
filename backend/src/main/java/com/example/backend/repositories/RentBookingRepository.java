package com.example.backend.repositories;

import com.example.backend.entities.RentBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RentBookingRepository extends JpaRepository<RentBooking, UUID> {

    /**
     * Получить все бронирования для конкретного объекта.
     * Это понадобится фронтенду, чтобы закрашивать занятые даты в календаре серым цветом.
     */
    List<RentBooking> findByRealEstateObjectId(UUID objectId);

    /**
     * Проверка, есть ли пересекающиеся бронирования на указанные даты для конкретного объекта.
     * Возвращает true, если даты УЖЕ заняты, и false, если свободны.
     * * Использование < и > (а не <= и >=) позволяет заезжать в день выезда предыдущего жильца.
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM RentBooking b " +
           "WHERE b.realEstateObject.id = :objectId " +
           "AND b.startDate < :endDate " +
           "AND b.endDate > :startDate")
    boolean hasOverlappingBookings(@Param("objectId") UUID objectId, 
                                   @Param("startDate") LocalDate startDate, 
                                   @Param("endDate") LocalDate endDate);
}