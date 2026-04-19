package com.example.backend.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "real_estate_objects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RealEstateObject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "external_id")
    private String externalId;

    private String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "object_status")
    private ObjectStatus objectStatus = ObjectStatus.FOR_SALE;

    private String category;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String city;

    @Column(length = 1000)
    private String address;

    @Column(name = "area_total")
    private BigDecimal areaTotal;

    @Column(name = "area_living")
    private BigDecimal areaLiving;

    private Integer floor;

    @Column(name = "floors_total")
    private Integer floorsTotal;

    @Column(name = "wall_material")
    private String wallMaterial;

    @Column(name = "year_built")
    private Integer yearBuilt;

    @Column(name = "price_total")
    private BigDecimal priceTotal;

    @Column(name = "price_per_m2")
    private BigDecimal pricePerM2;

    private String currency;

    @Column(name = "images_urls", columnDefinition = "LONGTEXT")
    private String imagesUrls;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(columnDefinition = "json")
    private String attributes;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"realEstateObjects", "passwordHash", "status", "role", "password"}) 
    private User user;

    @Column(name = "is_visible")
    private Boolean isVisible = true;

    // --- НОВЫЕ ПОЛЯ ДЛЯ ЛОГИКИ АРЕНДЫ/ПРОДАЖИ ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_occupant_id")
    @JsonIgnoreProperties({"realEstateObjects", "passwordHash", "status", "role", "password"})
    private User currentOccupant;

    @Column(name = "available_from")
    private LocalDateTime availableFrom;

    // --------------------------------------------

    public RealEstateObject() {
    }

    public RealEstateObject(UUID id, String externalId, String type, ObjectStatus objectStatus, String category, String title, 
                            String description, String city, String address, BigDecimal areaTotal, 
                            BigDecimal areaLiving, Integer floor, Integer floorsTotal, String wallMaterial, 
                            Integer yearBuilt, BigDecimal priceTotal, BigDecimal pricePerM2, String currency, 
                            String imagesUrls, String sourceUrl, LocalDateTime createdAt, 
                            LocalDateTime updatedAt, String attributes, User user, Boolean isVisible) {
        this.id = id;
        this.externalId = externalId;
        this.type = type;
        this.objectStatus = objectStatus;
        this.category = category;
        this.title = title;
        this.description = description;
        this.city = city;
        this.address = address;
        this.areaTotal = areaTotal;
        this.areaLiving = areaLiving;
        this.floor = floor;
        this.floorsTotal = floorsTotal;
        this.wallMaterial = wallMaterial;
        this.yearBuilt = yearBuilt;
        this.priceTotal = priceTotal;
        this.pricePerM2 = pricePerM2;
        this.currency = currency;
        this.imagesUrls = imagesUrls;
        this.sourceUrl = sourceUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.attributes = attributes;
        this.user = user;
        this.isVisible = isVisible;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public ObjectStatus getObjectStatus() { return objectStatus; }
    public void setObjectStatus(ObjectStatus objectStatus) { this.objectStatus = objectStatus; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public BigDecimal getAreaTotal() { return areaTotal; }
    public void setAreaTotal(BigDecimal areaTotal) { this.areaTotal = areaTotal; }

    public BigDecimal getAreaLiving() { return areaLiving; }
    public void setAreaLiving(BigDecimal areaLiving) { this.areaLiving = areaLiving; }

    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }

    public Integer getFloorsTotal() { return floorsTotal; }
    public void setFloorsTotal(Integer floorsTotal) { this.floorsTotal = floorsTotal; }

    public String getWallMaterial() { return wallMaterial; }
    public void setWallMaterial(String wallMaterial) { this.wallMaterial = wallMaterial; }

    public Integer getYearBuilt() { return yearBuilt; }
    public void setYearBuilt(Integer yearBuilt) { this.yearBuilt = yearBuilt; }

    public BigDecimal getPriceTotal() { return priceTotal; }
    public void setPriceTotal(BigDecimal priceTotal) { this.priceTotal = priceTotal; }

    public BigDecimal getPricePerM2() { return pricePerM2; }
    public void setPricePerM2(BigDecimal pricePerM2) { this.pricePerM2 = pricePerM2; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getImagesUrls() { return imagesUrls; }
    public void setImagesUrls(String imagesUrls) { this.imagesUrls = imagesUrls; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getAttributes() { return attributes; }
    public void setAttributes(String attributes) { this.attributes = attributes; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Boolean getIsVisible() { return isVisible; }
    public void setIsVisible(Boolean isVisible) { this.isVisible = isVisible; }

    public User getCurrentOccupant() { return currentOccupant; }
    public void setCurrentOccupant(User currentOccupant) { this.currentOccupant = currentOccupant; }

    public LocalDateTime getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(LocalDateTime availableFrom) { this.availableFrom = availableFrom; }

    @JsonProperty("ownerRole")
    public String getOwnerRole() {
        return (user != null && user.getRole() != null) ? user.getRole().name() : "UNKNOWN";
    }
}