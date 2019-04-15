<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:dm="http://marklogic.com/declarative-mapper"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:math="http://www.w3.org/2005/xpath-functions/math"
    xmlns:xd="http://www.oxygenxml.com/ns/doc/xsl"
    xmlns:map="http://marklogic.com/xdmp/map"
    xmlns:xdmp="http://marklogic.com/xdmp"
    exclude-result-prefixes="xs math xd"
    version="2.0">
    <xd:doc scope="stylesheet">
        <xd:desc>
            <xd:p><xd:b>Created on:</xd:b> Jul 14, 2018</xd:p>
            <xd:p><xd:b>Author:</xd:b> ngibson</xd:p>
            <xd:p>Note: this was regular expression driven until experimentation
            showed that simple string matching on potential data was faster.</xd:p>
        </xd:desc>
    </xd:doc>
    
    <xsl:param name="expressions" as="map:map" select="map:new(())"/>
    <xsl:variable name="keys" as="xs:string*" select="map:keys($expressions)"/>
    
    <xsl:template match="@*|node()">
       <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>
    
    <xsl:template match="processing-instruction()[contains(., '[[')][contains(., ']]')]" priority="1">
        <xsl:processing-instruction name="{name()}"><xsl:sequence select="dm:replace(., $keys)"/></xsl:processing-instruction>
    </xsl:template>
    
    <xsl:template match="comment()[contains(., '[[')][contains(., ']]')]" priority="1">
        <xsl:comment><xsl:sequence select="dm:replace(., $keys)"/></xsl:comment>
    </xsl:template>
        
    <xsl:template match="text()[contains(., '[[')][contains(., ']]')]" priority="1">
        <xsl:variable name="result" select="dm:replace(., $keys)"/>
        <xsl:message>Got <xsl:value-of select="count($result)"/> results</xsl:message>
        <xsl:sequence select="dm:replace(., $keys)"/>
    </xsl:template>
    
    <xsl:template match="attribute()[name() = local-name()][contains(., '[[')][contains(., ']]')]" priority="1">
        <xsl:attribute name="{name()}" select="dm:replace(., $keys)"/>
    </xsl:template>

    <xsl:template match="attribute()[not(name() = local-name())][contains(., '[[')][contains(., ']]')]" priority="1">
        <xsl:attribute name="{name()}"  namespace="{namespace-uri(.)}" select="dm:replace(., $keys)"/>
    </xsl:template>
    
    
    <xsl:template match="comment()[. = 'DEBUG']" priority="2">
        <xsl:comment>DEBUG: <xsl:value-of select="xdmp:quote($expressions)"/></xsl:comment>
    </xsl:template>
    
    
    <xsl:function name="dm:replace" as="item()*">
        <xsl:param name="input" as="xs:string"/>
        <xsl:param name="replacements" as="xs:string*"/>
        <xsl:variable name="current" select="$replacements[1]"/>
        <xsl:variable name="tail" select="subsequence($replacements, 2)"/>
        
        <xsl:choose>
            <xsl:when test="$input = ''">
                <xsl:sequence select="()"/>
            </xsl:when>
            <xsl:when test="not(contains($input, '[['))">
                <xsl:sequence select="$input"/>
            </xsl:when>
            <xsl:when test="empty($replacements)">
                <xsl:sequence select="$input"/>
            </xsl:when>
            <xsl:when test="contains($input, $current)">
                <xsl:sequence select="(
                        dm:replace(substring-before($input, $current), $tail),
                        map:get($expressions, $current),
                        dm:replace(substring-after($input, $current), $replacements)
                    )"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:sequence select="dm:replace($input, $tail)"/>
            </xsl:otherwise>
        </xsl:choose>       
    </xsl:function>

    
</xsl:stylesheet>